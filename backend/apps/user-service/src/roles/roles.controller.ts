import { USER_PATTERNS } from '@app/common/constants';
import { CreateRoleDto, UpdateRoleDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolesService } from './roles.service';

@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @MessagePattern(USER_PATTERNS.ROLES_FIND_ALL)
  findAll() {
    return this.roles.findAll();
  }

  @MessagePattern(USER_PATTERNS.ROLES_FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.roles.findOne(payload.data.id);
  }

  @MessagePattern(USER_PATTERNS.ROLES_CREATE)
  create(@Payload() payload: WithMeta<CreateRoleDto>) {
    return this.roles.create(payload.data, payload.meta);
  }

  @MessagePattern(USER_PATTERNS.ROLES_UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateRoleDto }>) {
    return this.roles.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(USER_PATTERNS.ROLES_REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.roles.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(USER_PATTERNS.PERMISSIONS_FIND_ALL)
  permissions() {
    return this.roles.findPermissions();
  }
}
