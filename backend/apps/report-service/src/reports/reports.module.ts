import { AttendanceRecord, AuditLog, Course, Group, GroupStudent, Invoice, Lesson, Payment, Student, Teacher } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Teacher, Group, Course, Lesson, AttendanceRecord, Payment, Invoice, AuditLog, GroupStudent])],
  controllers: [ReportsController],
  providers: [DashboardService, ReportsService],
})
export class ReportsModule {}
