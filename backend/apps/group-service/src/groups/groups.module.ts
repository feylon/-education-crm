import { AuditPublisher } from '@app/common/audit';
import { AttendanceRecord, Course, Group, GroupStudent, Invoice, Lesson, Payment, Room, Schedule, Student, Teacher } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsService } from './enrollments.service';
import { GroupStatisticsService } from './group-statistics.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupStudent, Course, Teacher, Room, Student, Lesson, Schedule, AttendanceRecord, Invoice, Payment])],
  controllers: [GroupsController],
  providers: [GroupsService, EnrollmentsService, GroupStatisticsService, AuditPublisher],
})
export class GroupsModule {}
