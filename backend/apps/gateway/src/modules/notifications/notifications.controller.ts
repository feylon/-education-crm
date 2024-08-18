import { NOTIFICATION_PATTERNS } from '@app/common/constants';
import { NotificationQueryDto, SendNotificationDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { NotificationResponseDto } from './notifications.response';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications' })
  @ApiPaginatedEnvelope(NotificationResponseDto)
  findAll(@Query() query: NotificationQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread notifications' })
  @ApiOkEnvelope()
  unreadCount(@Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.UNREAD_COUNT, { meta, data: {} });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkEnvelope(NotificationResponseDto)
  markRead(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.MARK_READ, { meta, data: { id } });
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiOkEnvelope()
  markAllRead(@Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.MARK_ALL_READ, { meta, data: {} });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one of my notifications' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.REMOVE, { meta, data: { id } });
  }

  @Post('send')
  @RequirePermissions('notifications.send')
  @ApiOperation({ summary: 'Send a system notification to users or roles' })
  @ApiOkEnvelope()
  send(@Body() dto: SendNotificationDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(NOTIFICATION_PATTERNS.SEND, { meta, data: dto });
  }
}
