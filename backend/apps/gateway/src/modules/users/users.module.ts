import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';

@Module({ controllers: [UsersController, RolesController, AuditController] })
export class UsersModule {}
