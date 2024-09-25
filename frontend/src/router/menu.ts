export interface MenuItem {
  key: string;
  labelKey: string;
  icon: string;
  to: string;
  permissions?: string[];
  roles?: string[];
  staffOnly?: boolean;
}

export interface MenuSection {
  labelKey?: string;
  items: MenuItem[];
}

export const MENU: MenuSection[] = [
  {
    items: [
      { key: 'dashboard', labelKey: 'nav.dashboard', icon: 'dashboard', to: '/dashboard', permissions: ['reports.read'], staffOnly: true },
      { key: 'my-dashboard', labelKey: 'nav.myDashboard', icon: 'dashboard', to: '/my', roles: ['TEACHER'] },
      { key: 'portal', labelKey: 'nav.myPortal', icon: 'portal', to: '/portal', roles: ['STUDENT'] },
    ],
  },
  {
    labelKey: 'nav.management',
    items: [
      { key: 'students', labelKey: 'nav.students', icon: 'students', to: '/students', permissions: ['students.read'], staffOnly: false },
      { key: 'teachers', labelKey: 'nav.teachers', icon: 'teachers', to: '/teachers', permissions: ['teachers.read'] },
      { key: 'courses', labelKey: 'nav.courses', icon: 'courses', to: '/courses', permissions: ['courses.read'], staffOnly: true },
      { key: 'groups', labelKey: 'nav.groups', icon: 'groups', to: '/groups', permissions: ['groups.read'] },
    ],
  },
  {
    labelKey: 'nav.academic',
    items: [
      { key: 'schedule', labelKey: 'nav.schedule', icon: 'schedule', to: '/schedule', permissions: ['schedules.read'] },
      { key: 'lessons', labelKey: 'nav.lessons', icon: 'lessons', to: '/lessons', permissions: ['lessons.read'] },
      { key: 'attendance', labelKey: 'nav.attendance', icon: 'attendance', to: '/attendance', permissions: ['attendance.read'] },
    ],
  },
  {
    labelKey: 'nav.finance',
    items: [
      { key: 'payments', labelKey: 'nav.payments', icon: 'payments', to: '/payments', permissions: ['payments.read'], staffOnly: true },
      { key: 'invoices', labelKey: 'nav.invoices', icon: 'invoices', to: '/invoices', permissions: ['invoices.read'], staffOnly: true },
      { key: 'debtors', labelKey: 'nav.debtors', icon: 'debtors', to: '/debtors', permissions: ['payments.read'], staffOnly: true },
      { key: 'reports', labelKey: 'nav.reports', icon: 'reports', to: '/reports', permissions: ['reports.read'], staffOnly: true },
    ],
  },
  {
    labelKey: 'nav.administration',
    items: [
      { key: 'notifications', labelKey: 'nav.notifications', icon: 'notifications', to: '/notifications' },
      { key: 'users', labelKey: 'nav.users', icon: 'users', to: '/settings/users', permissions: ['users.read'] },
      { key: 'roles', labelKey: 'nav.roles', icon: 'roles', to: '/settings/roles', permissions: ['roles.read'] },
      { key: 'branches', labelKey: 'nav.branches', icon: 'branches', to: '/settings/branches', permissions: ['branches.read'], staffOnly: true },
      { key: 'audit', labelKey: 'nav.audit', icon: 'audit', to: '/settings/audit', permissions: ['audit.read'] },
    ],
  },
];
