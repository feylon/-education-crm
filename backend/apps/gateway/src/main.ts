import { redisMicroserviceOptions } from '@app/common/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';
import { validationPipe } from './validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Gateway');

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGINS', '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1', { exclude: ['api/docs', 'api/docs-json'] });
  app.useGlobalPipes(validationPipe());
  app.enableShutdownHooks();

  if (config.get<boolean>('SWAGGER_ENABLED', true)) {
    setupSwagger(app);
  }

  app.connectMicroservice<MicroserviceOptions>(redisMicroserviceOptions(), { inheritAppConfig: false });
  await app.startAllMicroservices();

  const port = config.get<number>('GATEWAY_PORT', 3000);
  await app.listen(port);
  logger.log(`Gateway listening on http://localhost:${port}/api/v1, Swagger at /api/docs`);
}

bootstrap();
