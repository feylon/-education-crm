import { AuditPublisher } from '@app/common/audit';
import { RefreshToken, Role, User } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, RefreshToken])],
  controllers: [UsersController],
  providers: [UsersService, AuditPublisher],
})
export class UsersModule {}
