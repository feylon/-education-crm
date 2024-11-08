import { RpcUnauthorizedException } from '@app/common/rpc';
import { JwtService } from '@nestjs/jwt';
import { parseDurationSeconds, TokenService } from './token.service';

const config = {
  getOrThrow: (key: string) => (key === 'JWT_SECRET' ? 'access-secret-0123456789abcdef' : 'refresh-secret-0123456789abcdef'),
  get: (key: string, fallback: string) => (key === 'JWT_ACCESS_EXPIRES_IN' ? '15m' : key === 'JWT_REFRESH_EXPIRES_IN' ? '7d' : fallback),
};

describe('parseDurationSeconds', () => {
  it('parses s/m/h/d suffixes', () => {
    expect(parseDurationSeconds('30s')).toBe(30);
    expect(parseDurationSeconds('15m')).toBe(900);
    expect(parseDurationSeconds('2h')).toBe(7200);
    expect(parseDurationSeconds('7d')).toBe(604800);
    expect(parseDurationSeconds('120')).toBe(120);
  });
});

describe('TokenService', () => {
  const jwt = new JwtService({});
  const service = new TokenService(jwt, config as never);
  const payload = { sub: 'u1', email: 'a@b.c', roles: ['ADMIN'], permissions: ['students.read'] };

  it('signs an access token carrying roles and permissions and a refresh token with a jti', () => {
    const signed = service.sign(payload);
    const access = jwt.verify<Record<string, unknown>>(signed.accessToken, { secret: 'access-secret-0123456789abcdef' });
    const refresh = service.verifyRefresh(signed.refreshToken);
    expect(access).toMatchObject({ sub: 'u1', type: 'access', permissions: ['students.read'] });
    expect(refresh.jti).toBe(signed.refreshJti);
    expect(refresh.permissions).toEqual([]);
    expect(signed.expiresIn).toBe(900);
  });

  it('rejects an access token used as a refresh token', () => {
    const signed = service.sign(payload);
    expect(() => service.verifyRefresh(signed.accessToken)).toThrow(RpcUnauthorizedException);
  });

  it('hashes tokens deterministically', () => {
    expect(service.hash('abc')).toBe(service.hash('abc'));
    expect(service.hash('abc')).not.toBe(service.hash('abd'));
    expect(service.hash('abc')).toHaveLength(64);
  });
});
