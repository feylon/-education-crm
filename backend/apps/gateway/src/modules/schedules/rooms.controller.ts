import { SCHEDULE_PATTERNS } from '@app/common/constants';
import { CreateBranchDto, CreateRoomDto, RoomQueryDto, UpdateBranchDto, UpdateRoomDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, Meta, RequirePermissions } from '../../common';
import { BranchResponseDto, RoomResponseDto } from './schedules.response';

@ApiTags('Branches & Rooms')
@ApiBearerAuth()
@Controller()
export class RoomsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get('branches')
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'List branches' })
  @ApiOkResponse({ type: [BranchResponseDto] })
  branches(@Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.BRANCHES_FIND_ALL, { meta, data: {} });
  }

  @Post('branches')
  @RequirePermissions('branches.create')
  @ApiOperation({ summary: 'Create a branch' })
  @ApiOkEnvelope(BranchResponseDto)
  createBranch(@Body() dto: CreateBranchDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.BRANCHES_CREATE, { meta, data: dto });
  }

  @Patch('branches/:id')
  @RequirePermissions('branches.update')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiOkEnvelope(BranchResponseDto)
  updateBranch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.BRANCHES_UPDATE, { meta, data: { id, dto } });
  }

  @Delete('branches/:id')
  @RequirePermissions('branches.delete')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiOkEnvelope()
  removeBranch(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.BRANCHES_REMOVE, { meta, data: { id } });
  }

  @Get('rooms')
  @RequirePermissions('rooms.read')
  @ApiOperation({ summary: 'List rooms' })
  @ApiOkResponse({ type: [RoomResponseDto] })
  rooms(@Query() query: RoomQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.ROOMS_FIND_ALL, { meta, data: query });
  }

  @Post('rooms')
  @RequirePermissions('rooms.create')
  @ApiOperation({ summary: 'Create a room' })
  @ApiOkEnvelope(RoomResponseDto)
  createRoom(@Body() dto: CreateRoomDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.ROOMS_CREATE, { meta, data: dto });
  }

  @Patch('rooms/:id')
  @RequirePermissions('rooms.update')
  @ApiOperation({ summary: 'Update a room' })
  @ApiOkEnvelope(RoomResponseDto)
  updateRoom(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.ROOMS_UPDATE, { meta, data: { id, dto } });
  }

  @Delete('rooms/:id')
  @RequirePermissions('rooms.delete')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiOkEnvelope()
  removeRoom(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.ROOMS_REMOVE, { meta, data: { id } });
  }
}
