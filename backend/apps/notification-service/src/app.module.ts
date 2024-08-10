import { serviceEnvSchema } from '@app/common/config';
import { RpcClientModule } from '@app/common/rpc';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: serviceEnvSchema, envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
    RpcClientModule.register(),
    ScheduleModule.forRoot(),
    TelegramModule,
    NotificationsModule,
  ],
})
export class AppModule {}
