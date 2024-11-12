process.env.NODE_ENV = 'test';
process.env.POSTGRES_USER = 'postgres';
process.env.POSTGRES_PASSWORD = 'postgres';
process.env.POSTGRES_DB = 'education_crm_test';
process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6399';

import { AUTH_PATTERNS, RPC_CLIENT, STUDENT_PATTERNS } from '@app/common/constants';
import { RpcClientService } from '@app/common/rpc';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { validationPipe } from '../src/validation';

describe('Gateway (e2e)', () => {
  let app: INestApplication;
  const rpc = { send: jest.fn(), emit: jest.fn() };
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const tokenFor = (permissions: string[], roles = ['MANAGER']) =>
    jwt.sign({ sub: 'user-1', email: 'manager@crm.local', roles, permissions, type: 'access' }, { expiresIn: '5m' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RpcClientService)
      .useValue(rpc)
      .overrideProvider(RPC_CLIENT)
      .useValue({ connect: async () => undefined, close: () => undefined, send: jest.fn(), emit: jest.fn() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(validationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /auth/login returns the success envelope with tokens', async () => {
    rpc.send.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', expiresIn: 900, user: { id: 'user-1' } });
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@crm.local', password: 'Password123!' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, statusCode: 200, data: expect.objectContaining({ accessToken: 'a' }) });
    expect(rpc.send).toHaveBeenCalledWith(AUTH_PATTERNS.LOGIN, expect.objectContaining({ dto: { email: 'admin@crm.local', password: 'Password123!' } }));
  });

  it('POST /auth/login validates the body and returns the error envelope', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'nope', password: '' });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, statusCode: 400, message: 'Validation failed', path: '/api/v1/auth/login' });
    expect(response.body.errors).toEqual(expect.arrayContaining(['email must be an email']));
    expect(rpc.send).not.toHaveBeenCalled();
  });

  it('GET /students without a token is rejected with 401', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/students');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, statusCode: 401 });
  });

  it('GET /students with a token lacking the permission is rejected with 403', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/students').set('Authorization', `Bearer ${tokenFor(['payments.read'])}`);
    expect(response.status).toBe(403);
    expect(rpc.send).not.toHaveBeenCalled();
  });

  it('GET /students forwards meta and query to the student service when permitted', async () => {
    rpc.send.mockResolvedValue({ items: [], meta: { page: 2, limit: 5, total: 0, totalPages: 1 } });
    const response = await request(app.getHttpServer())
      .get('/api/v1/students?page=2&limit=5&status=ACTIVE')
      .set('Authorization', `Bearer ${tokenFor(['students.read'])}`)
      .set('User-Agent', 'jest');
    expect(response.status).toBe(200);
    expect(response.body.data.meta.page).toBe(2);
    expect(rpc.send).toHaveBeenCalledWith(
      STUDENT_PATTERNS.FIND_ALL,
      expect.objectContaining({
        meta: expect.objectContaining({ userId: 'user-1', permissions: ['students.read'], userAgent: 'jest' }),
        data: expect.objectContaining({ page: 2, limit: 5, status: 'ACTIVE' }),
      }),
    );
  });

  it('SUPER_ADMIN bypasses permission checks', async () => {
    rpc.send.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    const response = await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${tokenFor([], ['SUPER_ADMIN'])}`);
    expect(response.status).toBe(200);
  });

  it('translates service errors into the error envelope', async () => {
    const { RpcNotFoundException } = await import('@app/common/rpc');
    const { HttpException } = await import('@nestjs/common');
    rpc.send.mockRejectedValue(new HttpException({ statusCode: 404, message: 'Student not found', errors: [] }, 404));
    const response = await request(app.getHttpServer())
      .get('/api/v1/students/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${tokenFor(['students.read'])}`);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, statusCode: 404, message: 'Student not found' });
    expect(new RpcNotFoundException().getError()).toMatchObject({ statusCode: 404 });
  });

  it('rejects a refresh token used as a bearer token', async () => {
    const refresh = jwt.sign({ sub: 'user-1', type: 'refresh', roles: [], permissions: [] }, { expiresIn: '5m' });
    const response = await request(app.getHttpServer()).get('/api/v1/students').set('Authorization', `Bearer ${refresh}`);
    expect(response.status).toBe(401);
  });
});
