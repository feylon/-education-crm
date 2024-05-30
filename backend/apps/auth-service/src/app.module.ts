import { authEnvSchema } from '@app/common/config';
import { RpcClientModule } from '@app/common/rpc';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: authEnvSchema, envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
    RpcClientModule.register(),
    AuthModule,
  ],
})
export class AppModule {}
