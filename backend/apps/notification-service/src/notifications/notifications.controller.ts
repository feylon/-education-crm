import { NOTIFICATION_PATTERNS } from '@app/common/constants';
import { NotificationQueryDto, SendNotificationDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @MessagePattern(NOTIFICATION_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<NotificationQueryDto>) {
    return this.notifications.findAll(payload.data, payload.meta);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.UNREAD_COUNT)
  unreadCount(@Payload() payload: WithMeta<Record<string, never>>) {
    return this.notifications.unreadCount(payload.meta);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_READ)
  markRead(@Payload() payload: WithMeta<{ id: string }>) {
    return this.notifications.markRead(payload.data.id, payload.meta);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_ALL_READ)
  markAllRead(@Payload() payload: WithMeta<Record<string, never>>) {
    return this.notifications.markAllRead(payload.meta);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.notifications.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.SEND)
  send(@Payload() payload: WithMeta<SendNotificationDto>) {
    return this.notifications.send(payload.data, payload.meta);
  }
}
