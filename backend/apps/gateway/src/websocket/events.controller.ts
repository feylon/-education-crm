import { EVENTS } from '@app/common/constants';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsGateway } from './notifications.gateway';

interface NotificationCreatedEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

@Controller()
export class EventsController {
  constructor(private readonly gateway: NotificationsGateway) {}

  @EventPattern(EVENTS.NOTIFICATION_CREATED)
  onNotificationCreated(@Payload() event: NotificationCreatedEvent): void {
    this.gateway.pushToUser(event.userId, 'notification', event);
  }
}
