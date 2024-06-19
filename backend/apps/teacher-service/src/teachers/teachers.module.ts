import { AuditPublisher } from '@app/common/audit';
import { AttendanceRecord, Group, GroupStudent, Lesson, Role, Schedule, Teacher, User } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, User, Role, Group, GroupStudent, Schedule, Lesson, AttendanceRecord])],
  controllers: [TeachersController],
  providers: [TeachersService, TeacherDashboardService, AuditPublisher],
})
export class TeachersModule {}
