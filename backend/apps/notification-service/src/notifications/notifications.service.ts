import { EVENTS } from '@app/common/constants';
import { NotificationQueryDto, SendNotificationDto } from '@app/common/dto';
import { NotificationType } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcNotFoundException } from '@app/common/rpc';
import { paginateQuery } from '@app/common/utils';
import { Notification } from '@app/database';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramApiService } from '../telegram/telegram-api.service';
import { AudienceService } from './audience.service';

export interface NotifyInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  telegramChatIds?: string[];
  telegramText?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    private readonly audience: AudienceService,
    private readonly telegram: TelegramApiService,
    private readonly rpc: RpcClientService,
  ) {}

  async notify(input: NotifyInput): Promise<Notification[]> {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    const rows = userIds.length
      ? await this.notifications.save(
          userIds.map((userId) =>
            this.notifications.create({ userId, type: input.type, title: input.title, body: input.body, data: input.data ?? null }),
          ),
        )
      : [];
    for (const row of rows) {
      this.rpc.emit(EVENTS.NOTIFICATION_CREATED, {
        id: row.id,
        userId: row.userId,
        type: row.type,
        title: row.title,
        body: row.body,
        data: row.data,
        isRead: false,
        createdAt: row.createdAt,
      });
    }
    await this.pushTelegram(userIds, input);
    return rows;
  }

  private async pushTelegram(userIds: string[], input: NotifyInput): Promise<void> {
    if (!this.telegram.enabled) {
      return;
    }
    const text = input.telegramText ?? `<b>${input.title}</b>\n${input.body}`;
    const chatIds = new Set(input.telegramChatIds ?? []);
    for (const chatId of (await this.audience.chatIdsForUsers(userIds)).values()) {
      chatIds.add(chatId);
    }
    await Promise.all([...chatIds].map((chatId) => this.telegram.sendMessage(chatId, text)));
  }

  async findAll(query: NotificationQueryDto, meta: RequestMeta): Promise<Paginated<Notification>> {
    const qb = this.notifications.createQueryBuilder('notification').where('notification.userId = :userId', { userId: meta.userId });
    if (query.unreadOnly) qb.andWhere('notification.isRead = false');
    if (query.type) qb.andWhere('notification.type = :type', { type: query.type });
    if (query.search) qb.andWhere('(notification.title ILIKE :search OR notification.body ILIKE :search)', { search: `%${query.search}%` });
    qb.orderBy('notification.createdAt', 'DESC');
    return paginateQuery(qb, query);
  }

  async unreadCount(meta: RequestMeta): Promise<{ count: number }> {
    return { count: await this.notifications.count({ where: { userId: meta.userId, isRead: false } }) };
  }

  async markRead(id: string, meta: RequestMeta): Promise<Notification> {
    const notification = await this.notifications.findOne({ where: { id, userId: meta.userId } });
    if (!notification) {
      throw new RpcNotFoundException('Notification not found');
    }
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notifications.save(notification);
    }
    return notification;
  }

  async markAllRead(meta: RequestMeta): Promise<{ updated: number }> {
    const result = await this.notifications.update({ userId: meta.userId, isRead: false }, { isRead: true, readAt: new Date() });
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const result = await this.notifications.delete({ id, userId: meta.userId });
    if (!result.affected) {
      throw new RpcNotFoundException('Notification not found');
    }
    return { deleted: true };
  }

  async send(dto: SendNotificationDto, meta: RequestMeta): Promise<{ sent: number }> {
    const userIds = new Set(dto.userIds ?? []);
    if (dto.roles?.length) {
      for (const id of await this.audience.usersWithRoles(dto.roles)) {
        userIds.add(id);
      }
    }
    if (userIds.size === 0) {
      throw new RpcBadRequestException('No recipients resolved');
    }
    const rows = await this.notify({
      userIds: [...userIds],
      type: NotificationType.SYSTEM,
      title: dto.title,
      body: dto.body,
      data: { sentBy: meta.userId },
    });
    this.logger.log(`Manual notification sent to ${rows.length} user(s) by ${meta.email}`);
    return { sent: rows.length };
  }
}
