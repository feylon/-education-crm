import { RpcUnauthorizedException } from '@app/common/rpc';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const configStub = {
  getOrThrow: (key: string) => (key === 'JWT_SECRET' ? 'access-secret-0123456789abcdef' : 'refresh-secret-0123456789abcdef'),
  get: (_key: string, fallback: string) => fallback,
};

const buildUser = async () => ({
  id: 'user-1',
  email: 'admin@crm.local',
  firstName: 'Admin',
  lastName: 'User',
  phone: null,
  avatarUrl: null,
  isActive: true,
  passwordHash: await bcrypt.hash('Password123!', 4),
  roles: [{ name: 'ADMIN', permissions: [{ code: 'students.read' }, { code: 'students.create' }] }],
});

describe('AuthService', () => {
  let service: AuthService;
  let tokens: TokenService;
  let stored: Record<string, unknown>[];
  let user: Awaited<ReturnType<typeof buildUser>>;
  let users: { createQueryBuilder: jest.Mock; update: jest.Mock; findOne: jest.Mock };
  let refreshTokens: { save: jest.Mock; create: jest.Mock; findOne: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    user = await buildUser();
    stored = [];
    tokens = new TokenService(new JwtService({}), configStub as never);
    users = {
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      })),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(user),
    };
    refreshTokens = {
      create: jest.fn((data: Record<string, unknown>) => data),
      save: jest.fn(async (data: Record<string, unknown>) => {
        const row = { id: `rt-${stored.length + 1}`, revokedAt: null, ...data };
        stored.push(row);
        return row;
      }),
      findOne: jest.fn(async ({ where }: { where: { tokenHash: string } }) =>
        stored.find((row) => row.tokenHash === where.tokenHash) ?? null,
      ),
      update: jest.fn(async (id: string, patch: Record<string, unknown>) => {
        const row = stored.find((item) => item.id === id);
        if (row) Object.assign(row, patch);
      }),
    };
    const teachers = { findOne: jest.fn().mockResolvedValue(null) };
    const students = { findOne: jest.fn().mockResolvedValue(null) };
    const audit = { publish: jest.fn() };
    const rpc = { emit: jest.fn() };
    service = new AuthService(
      users as never,
      refreshTokens as never,
      teachers as never,
      students as never,
      tokens,
      audit as never,
      rpc as never,
    );
  });

  it('logs in with valid credentials and returns tokens with permissions', async () => {
    const result = await service.login({ email: 'admin@crm.local', password: 'Password123!' }, {});
    expect(result.accessToken).toBeDefined();
    expect(result.user.permissions).toEqual(['students.create', 'students.read']);
    expect(result.user.roles).toEqual(['ADMIN']);
    expect(stored).toHaveLength(1);
  });

  it('rejects a wrong password', async () => {
    await expect(service.login({ email: 'admin@crm.local', password: 'nope' }, {})).rejects.toBeInstanceOf(
      RpcUnauthorizedException,
    );
  });

  it('rejects an inactive account', async () => {
    user.isActive = false;
    await expect(service.login({ email: 'admin@crm.local', password: 'Password123!' }, {})).rejects.toThrow(
      'Account is deactivated',
    );
  });

  it('rotates the refresh token and refuses reuse of the old one', async () => {
    const login = await service.login({ email: 'admin@crm.local', password: 'Password123!' }, {});
    const refreshed = await service.refresh(login.refreshToken, {});
    expect(refreshed.refreshToken).not.toEqual(login.refreshToken);
    expect(stored[0].revokedAt).not.toBeNull();
    await expect(service.refresh(login.refreshToken, {})).rejects.toBeInstanceOf(RpcUnauthorizedException);
    await expect(service.refresh(refreshed.refreshToken, {})).resolves.toHaveProperty('accessToken');
  });

  it('rejects a refresh token signed with the wrong secret', async () => {
    const forged = new JwtService({}).sign({ sub: 'user-1', type: 'refresh', jti: 'x' }, { secret: 'wrong-secret' });
    await expect(service.refresh(forged, {})).rejects.toBeInstanceOf(RpcUnauthorizedException);
  });
});
