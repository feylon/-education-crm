import { RoleName } from '../enums';
import { RequestMeta } from '../interfaces';

const STAFF_ROLES: string[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.CASHIER];

export const isStaff = (meta: RequestMeta): boolean => meta.roles.some((role) => STAFF_ROLES.includes(role));

export const isTeacherScoped = (meta: RequestMeta): boolean => !isStaff(meta) && meta.roles.includes(RoleName.TEACHER);

export const isStudentScoped = (meta: RequestMeta): boolean =>
  !isStaff(meta) && !meta.roles.includes(RoleName.TEACHER) && meta.roles.includes(RoleName.STUDENT);
