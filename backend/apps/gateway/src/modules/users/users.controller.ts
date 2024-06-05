import { USER_PATTERNS } from '@app/common/constants';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { UserResponseDto } from './users.response';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List staff users' })
  @ApiPaginatedEnvelope(UserResponseDto)
  findAll(@Query() query: UserQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get a user' })
  @ApiOkEnvelope(UserResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a user' })
  @ApiOkEnvelope(UserResponseDto)
  create(@Body() dto: CreateUserDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkEnvelope(UserResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.REMOVE, { meta, data: { id } });
  }
}
