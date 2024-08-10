import { Group, Invoice, Notification, Parent, Student, Teacher, User } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramModule } from '../telegram/telegram.module';
import { AudienceService } from './audience.service';
import { DomainEventsController } from './domain-events.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ReminderJobs } from './reminder.jobs';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Student, Teacher, Group, Parent, Invoice]), TelegramModule],
  controllers: [NotificationsController, DomainEventsController],
  providers: [NotificationsService, AudienceService, ReminderJobs],
})
export class NotificationsModule {}
