import { AttendanceRecord } from './attendance-record.entity';
import { AuditLog } from './audit-log.entity';
import { Branch } from './branch.entity';
import { Course } from './course.entity';
import { CourseCategory } from './course-category.entity';
import { Group } from './group.entity';
import { GroupStudent } from './group-student.entity';
import { Invoice } from './invoice.entity';
import { Lesson } from './lesson.entity';
import { Notification } from './notification.entity';
import { Parent } from './parent.entity';
import { Payment } from './payment.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Permission } from './permission.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from './role.entity';
import { Room } from './room.entity';
import { Schedule } from './schedule.entity';
import { StoredFile } from './stored-file.entity';
import { Student } from './student.entity';
import { Teacher } from './teacher.entity';
import { User } from './user.entity';

export * from './base.entity';
export * from './attendance-record.entity';
export * from './audit-log.entity';
export * from './branch.entity';
export * from './course.entity';
export * from './course-category.entity';
export * from './group.entity';
export * from './group-student.entity';
export * from './invoice.entity';
export * from './lesson.entity';
export * from './notification.entity';
export * from './parent.entity';
export * from './payment.entity';
export * from './payment-allocation.entity';
export * from './permission.entity';
export * from './refresh-token.entity';
export * from './role.entity';
export * from './room.entity';
export * from './schedule.entity';
export * from './stored-file.entity';
export * from './student.entity';
export * from './teacher.entity';
export * from './user.entity';

export const ENTITIES = [
  User,
  Role,
  Permission,
  RefreshToken,
  AuditLog,
  Branch,
  Room,
  CourseCategory,
  Course,
  Student,
  Parent,
  Teacher,
  Group,
  GroupStudent,
  Schedule,
  Lesson,
  AttendanceRecord,
  Invoice,
  Payment,
  PaymentAllocation,
  Notification,
  StoredFile,
];
