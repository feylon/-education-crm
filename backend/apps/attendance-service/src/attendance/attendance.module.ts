import { AuditPublisher } from '@app/common/audit';
import { AttendanceRecord, Group, GroupStudent, Lesson, Room, Schedule, Student, Teacher } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceStatisticsService } from './attendance-statistics.service';
import { LessonsService } from './lessons.service';
import { ScopeService } from './scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, AttendanceRecord, Group, GroupStudent, Schedule, Teacher, Student, Room])],
  controllers: [AttendanceController],
  providers: [LessonsService, AttendanceService, AttendanceStatisticsService, ScopeService, AuditPublisher],
})
export class AttendanceModule {}
