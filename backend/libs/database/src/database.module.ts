import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions({
          POSTGRES_HOST: config.get<string>('POSTGRES_HOST'),
          POSTGRES_PORT: config.get<number>('POSTGRES_PORT'),
          POSTGRES_USER: config.get<string>('POSTGRES_USER'),
          POSTGRES_PASSWORD: config.get<string>('POSTGRES_PASSWORD'),
          POSTGRES_DB: config.get<string>('POSTGRES_DB'),
          POSTGRES_SSL: config.get<string>('POSTGRES_SSL'),
          NODE_ENV: config.get<string>('NODE_ENV'),
        }),
    }),
  ],
})
export class DatabaseModule {}
