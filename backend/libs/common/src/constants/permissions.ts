export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
}

const crud = (module: string, label: string): PermissionDefinition[] => [
  { code: `${module}.read`, module, description: `View ${label}` },
  { code: `${module}.create`, module, description: `Create ${label}` },
  { code: `${module}.update`, module, description: `Update ${label}` },
  { code: `${module}.delete`, module, description: `Delete ${label}` },
];

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  ...crud('users', 'users'),
  ...crud('roles', 'roles'),
  { code: 'permissions.read', module: 'permissions', description: 'View permissions' },
  ...crud('students', 'students'),
  ...crud('teachers', 'teachers'),
  ...crud('courses', 'courses'),
  ...crud('groups', 'groups'),
  { code: 'groups.enroll', module: 'groups', description: 'Enroll and remove students' },
  ...crud('schedules', 'schedules'),
  ...crud('rooms', 'rooms'),
  ...crud('branches', 'branches'),
  { code: 'lessons.read', module: 'lessons', description: 'View lessons' },
  { code: 'lessons.create', module: 'lessons', description: 'Create lessons' },
  { code: 'lessons.update', module: 'lessons', description: 'Update lessons' },
  { code: 'attendance.read', module: 'attendance', description: 'View attendance' },
  { code: 'attendance.mark', module: 'attendance', description: 'Mark attendance' },
  { code: 'payments.read', module: 'payments', description: 'View payments' },
  { code: 'payments.create', module: 'payments', description: 'Record payments' },
  { code: 'payments.update', module: 'payments', description: 'Refund or cancel payments' },
  { code: 'invoices.read', module: 'invoices', description: 'View invoices' },
  { code: 'invoices.create', module: 'invoices', description: 'Create and generate invoices' },
  { code: 'invoices.update', module: 'invoices', description: 'Update invoices' },
  { code: 'notifications.read', module: 'notifications', description: 'View notifications' },
  { code: 'notifications.send', module: 'notifications', description: 'Send notifications' },
  { code: 'reports.read', module: 'reports', description: 'View reports and dashboard' },
  { code: 'audit.read', module: 'audit', description: 'View audit log' },
  { code: 'files.upload', module: 'files', description: 'Upload files' },
];

export const PERMISSION_CODES = PERMISSION_CATALOG.map((permission) => permission.code);
