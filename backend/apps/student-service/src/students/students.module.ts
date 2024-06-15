import { AuditPublisher } from '@app/common/audit';
import { AttendanceRecord, GroupStudent, Invoice, Parent, Payment, Role, Student, Teacher, User } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentProfileService } from './student-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Parent, User, Role, Teacher, GroupStudent, AttendanceRecord, Invoice, Payment])],
  controllers: [StudentsController],
  providers: [StudentsService, StudentProfileService, AuditPublisher],
})
export class StudentsModule {}
