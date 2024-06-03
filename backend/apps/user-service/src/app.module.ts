import { serviceEnvSchema } from '@app/common/config';
import { RpcClientModule } from '@app/common/rpc';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: serviceEnvSchema, envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
    RpcClientModule.register(),
    UsersModule,
    RolesModule,
    AuditModule,
  ],
})
export class AppModule {}
