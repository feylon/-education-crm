import * as Joi from 'joi';

export const baseEnvSchema = {
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'log', 'debug', 'verbose').default('log'),
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_SSL: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
};

export const serviceEnvSchema = Joi.object({ ...baseEnvSchema }).unknown(true);

const secret = () =>
  Joi.string()
    .min(16)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(32).pattern(/^(?!change-me)/, 'non-placeholder').messages({
        'string.pattern.name': 'must not use the placeholder value from .env.example in production',
        'string.min': 'must be at least 32 characters in production',
      }),
    });

export const gatewayEnvSchema = Joi.object({
  ...baseEnvSchema,
  GATEWAY_PORT: Joi.number().default(3000),
  JWT_SECRET: secret(),
  JWT_REFRESH_SECRET: secret(),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173,http://localhost:8080'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),
  SWAGGER_ENABLED: Joi.boolean().default(true),
}).unknown(true);

export const authEnvSchema = Joi.object({
  ...baseEnvSchema,
  JWT_SECRET: secret(),
  JWT_REFRESH_SECRET: secret(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
}).unknown(true);
