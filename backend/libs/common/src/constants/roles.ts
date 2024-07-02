import { RoleName } from '../enums';
import { PERMISSION_CODES } from './permissions';

const byPrefix = (...prefixes: string[]) =>
  PERMISSION_CODES.filter((code) => prefixes.some((prefix) => code.startsWith(`${prefix}.`)));

export interface RoleDefinition {
  name: RoleName;
  description: string;
  permissions: string[];
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: RoleName.SUPER_ADMIN,
    description: 'Full access to every resource',
    permissions: PERMISSION_CODES,
  },
  {
    name: RoleName.ADMIN,
    description: 'Administrative access without role management',
    permissions: PERMISSION_CODES.filter((code) => !code.startsWith('roles.')),
  },
  {
    name: RoleName.MANAGER,
    description: 'Manages students, teachers, courses, groups and schedules',
    permissions: [
      ...byPrefix('students', 'teachers', 'courses', 'groups', 'schedules', 'rooms', 'branches'),
      'lessons.read',
      'lessons.create',
      'lessons.update',
      'attendance.read',
      'payments.read',
      'invoices.read',
      'notifications.read',
      'notifications.send',
      'reports.read',
      'files.upload',
      'users.read',
    ],
  },
  {
    name: RoleName.TEACHER,
    description: 'Teaches groups and marks attendance',
    permissions: [
      'students.read',
      'groups.read',
      'courses.read',
      'schedules.read',
      'rooms.read',
      'lessons.read',
      'lessons.create',
      'lessons.update',
      'attendance.read',
      'attendance.mark',
      'notifications.read',
    ],
  },
  {
    name: RoleName.CASHIER,
    description: 'Records payments and manages invoices',
    permissions: [
      'students.read',
      'groups.read',
      'courses.read',
      'payments.read',
      'payments.create',
      'payments.update',
      'invoices.read',
      'invoices.create',
      'invoices.update',
      'notifications.read',
      'reports.read',
    ],
  },
  {
    name: RoleName.STUDENT,
    description: 'Views own profile, attendance, schedule and payments',
    permissions: [
      'groups.read',
      'schedules.read',
      'lessons.read',
      'attendance.read',
      'payments.read',
      'invoices.read',
      'notifications.read',
    ],
  },
];
