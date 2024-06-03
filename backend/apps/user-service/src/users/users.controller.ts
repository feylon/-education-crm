import { USER_PATTERNS } from '@app/common/constants';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(USER_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<UserQueryDto>) {
    return this.users.findAll(payload.data);
  }

  @MessagePattern(USER_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.users.findOne(payload.data.id);
  }

  @MessagePattern(USER_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateUserDto>) {
    return this.users.create(payload.data, payload.meta);
  }

  @MessagePattern(USER_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateUserDto }>) {
    return this.users.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(USER_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.users.remove(payload.data.id, payload.meta);
  }
}
