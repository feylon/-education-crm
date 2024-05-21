import { INestMicroservice, Logger, Type, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { createServer, Server } from 'http';
import { redisMicroserviceOptions } from '../config/microservice.options';

export interface MicroserviceBootstrapResult {
  app: INestMicroservice;
  healthServer: Server;
}

const startHealthServer = (serviceName: string, isReady: () => boolean): Server => {
  const port = Number(process.env.HEALTH_PORT ?? 3001);
  const server = createServer((request, response) => {
    if (request.url === '/health') {
      const ready = isReady();
      response.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: ready ? 'ok' : 'starting', service: serviceName }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  server.listen(port);
  return server;
};

export const bootstrapMicroservice = async (
  module: Type<unknown>,
  serviceName: string,
): Promise<MicroserviceBootstrapResult> => {
  const logger = new Logger(serviceName);
  let ready = false;
  const healthServer = startHealthServer(serviceName, () => ready);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(module, {
    ...redisMicroserviceOptions(),
    logger: ['error', 'warn', 'log'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen();
  ready = true;
  logger.log(`${serviceName} is listening on Redis transport, health on :${process.env.HEALTH_PORT ?? 3001}`);
  return { app, healthServer };
};
