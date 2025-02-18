import { gatewayEnvSchema } from './env.validation';

const baseEnv = {
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  POSTGRES_DB: 'crm',
  JWT_SECRET: 'change-me-to-a-long-random-access-secret',
  JWT_REFRESH_SECRET: 'change-me-to-a-long-random-refresh-secret',
};

describe('gatewayEnvSchema', () => {
  it('accepts placeholder secrets in development', () => {
    expect(gatewayEnvSchema.validate({ ...baseEnv, NODE_ENV: 'development' }).error).toBeUndefined();
  });

  it('rejects placeholder secrets in production', () => {
    const { error } = gatewayEnvSchema.validate({ ...baseEnv, NODE_ENV: 'production' });
    expect(error?.message).toContain('placeholder');
  });

  it('rejects short secrets in production', () => {
    const { error } = gatewayEnvSchema.validate({ ...baseEnv, NODE_ENV: 'production', JWT_SECRET: 'short-but-sixteen!', JWT_REFRESH_SECRET: 'x'.repeat(40) });
    expect(error?.message).toContain('32 characters');
  });

  it('accepts strong secrets in production', () => {
    expect(gatewayEnvSchema.validate({ ...baseEnv, NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40) }).error).toBeUndefined();
  });
});
