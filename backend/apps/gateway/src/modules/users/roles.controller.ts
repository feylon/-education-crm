import { USER_PATTERNS } from '@app/common/constants';
import { CreateRoleDto, UpdateRoleDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, Meta, RequirePermissions } from '../../common';
import { PermissionResponseDto, RoleResponseDto } from './users.response';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get('roles')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List roles with permissions' })
  @ApiOkResponse({ type: [RoleResponseDto] })
  findAll(@Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.ROLES_FIND_ALL, { meta, data: {} });
  }

  @Get('roles/:id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get a role' })
  @ApiOkEnvelope(RoleResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.ROLES_FIND_ONE, { meta, data: { id } });
  }

  @Post('roles')
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiOkEnvelope(RoleResponseDto)
  create(@Body() dto: CreateRoleDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.ROLES_CREATE, { meta, data: dto });
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Update a role and its permissions' })
  @ApiOkEnvelope(RoleResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.ROLES_UPDATE, { meta, data: { id, dto } });
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.ROLES_REMOVE, { meta, data: { id } });
  }

  @Get('permissions')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Permission catalogue' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  permissions(@Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.PERMISSIONS_FIND_ALL, { meta, data: {} });
  }
}
