import { RedisOptions, Transport } from '@nestjs/microservices';

export const redisMicroserviceOptions = (): RedisOptions => ({
  transport: Transport.REDIS,
  options: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    retryAttempts: 20,
    retryDelay: 2000,
  },
});
