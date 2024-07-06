import { AuditPublisher } from '@app/common/audit';
import { Branch, Group, Lesson, Room, Schedule, Student, Teacher } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { CalendarService } from './calendar.service';
import { RoomsService } from './rooms.service';
import { ScheduleController } from './schedule.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Group, Room, Branch, Teacher, Student, Lesson])],
  controllers: [ScheduleController],
  providers: [SchedulesService, RoomsService, BranchesService, CalendarService, AuditPublisher],
})
export class ScheduleModule {}
