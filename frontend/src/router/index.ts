import { useAuthStore } from '@/stores/auth.store';
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    titleKey?: string;
    permissions?: string[];
    roles?: string[];
    public?: boolean;
    layout?: 'default' | 'auth' | 'blank';
    breadcrumbs?: Array<{ titleKey: string; to?: string }>;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'), meta: { public: true, layout: 'auth', titleKey: 'auth.title' } },
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'home', component: () => import('@/views/dashboard/HomeRedirect.vue'), meta: { titleKey: 'nav.dashboard' } },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { titleKey: 'nav.dashboard', permissions: ['reports.read'] },
  },
  { path: '/my', name: 'teacher-dashboard', component: () => import('@/views/teachers/TeacherDashboardView.vue'), meta: { titleKey: 'nav.myDashboard', roles: ['TEACHER'] } },
  { path: '/portal', name: 'portal', component: () => import('@/views/portal/StudentPortalView.vue'), meta: { titleKey: 'nav.myPortal', roles: ['STUDENT'] } },
  { path: '/students', name: 'students', component: () => import('@/views/students/StudentsListView.vue'), meta: { titleKey: 'nav.students', permissions: ['students.read'] } },
  {
    path: '/students/:id',
    name: 'student-detail',
    component: () => import('@/views/students/StudentDetailView.vue'),
    meta: { titleKey: 'students.profile', permissions: ['students.read'], breadcrumbs: [{ titleKey: 'nav.students', to: '/students' }] },
  },
  { path: '/teachers', name: 'teachers', component: () => import('@/views/teachers/TeachersListView.vue'), meta: { titleKey: 'nav.teachers', permissions: ['teachers.read'] } },
  {
    path: '/teachers/:id',
    name: 'teacher-detail',
    component: () => import('@/views/teachers/TeacherDetailView.vue'),
    meta: { titleKey: 'teachers.profile', permissions: ['teachers.read'], breadcrumbs: [{ titleKey: 'nav.teachers', to: '/teachers' }] },
  },
  { path: '/courses', name: 'courses', component: () => import('@/views/courses/CoursesView.vue'), meta: { titleKey: 'nav.courses', permissions: ['courses.read'] } },
  { path: '/groups', name: 'groups', component: () => import('@/views/groups/GroupsListView.vue'), meta: { titleKey: 'nav.groups', permissions: ['groups.read'] } },
  {
    path: '/groups/:id',
    name: 'group-detail',
    component: () => import('@/views/groups/GroupDetailView.vue'),
    meta: { titleKey: 'common.details', permissions: ['groups.read'], breadcrumbs: [{ titleKey: 'nav.groups', to: '/groups' }] },
  },
  { path: '/schedule', name: 'schedule', component: () => import('@/views/schedule/ScheduleView.vue'), meta: { titleKey: 'nav.schedule', permissions: ['schedules.read'] } },
  { path: '/lessons', name: 'lessons', component: () => import('@/views/lessons/LessonsListView.vue'), meta: { titleKey: 'nav.lessons', permissions: ['lessons.read'] } },
  {
    path: '/lessons/:id/attendance',
    name: 'lesson-attendance',
    component: () => import('@/views/lessons/AttendanceMarkView.vue'),
    meta: { titleKey: 'lessons.attendance', permissions: ['attendance.read'], breadcrumbs: [{ titleKey: 'nav.lessons', to: '/lessons' }] },
  },
  { path: '/attendance', name: 'attendance', component: () => import('@/views/lessons/AttendanceOverviewView.vue'), meta: { titleKey: 'nav.attendance', permissions: ['attendance.read'] } },
  { path: '/payments', name: 'payments', component: () => import('@/views/payments/PaymentsView.vue'), meta: { titleKey: 'nav.payments', permissions: ['payments.read'] } },
  { path: '/invoices', name: 'invoices', component: () => import('@/views/payments/InvoicesView.vue'), meta: { titleKey: 'nav.invoices', permissions: ['invoices.read'] } },
  { path: '/debtors', name: 'debtors', component: () => import('@/views/payments/DebtorsView.vue'), meta: { titleKey: 'nav.debtors', permissions: ['payments.read'] } },
  { path: '/reports', name: 'reports', component: () => import('@/views/dashboard/ReportsView.vue'), meta: { titleKey: 'nav.reports', permissions: ['reports.read'] } },
  { path: '/notifications', name: 'notifications', component: () => import('@/views/notifications/NotificationsView.vue'), meta: { titleKey: 'nav.notifications' } },
  { path: '/settings/users', name: 'users', component: () => import('@/views/settings/UsersView.vue'), meta: { titleKey: 'nav.users', permissions: ['users.read'] } },
  { path: '/settings/roles', name: 'roles', component: () => import('@/views/settings/RolesView.vue'), meta: { titleKey: 'nav.roles', permissions: ['roles.read'] } },
  { path: '/settings/branches', name: 'branches', component: () => import('@/views/settings/BranchesView.vue'), meta: { titleKey: 'nav.branches', permissions: ['branches.read'] } },
  { path: '/settings/audit', name: 'audit', component: () => import('@/views/settings/AuditLogView.vue'), meta: { titleKey: 'nav.audit', permissions: ['audit.read'] } },
  { path: '/profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue'), meta: { titleKey: 'nav.profile' } },
  { path: '/forbidden', name: 'forbidden', component: () => import('@/views/errors/ForbiddenView.vue'), meta: { titleKey: 'errors.forbiddenTitle', layout: 'blank' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/errors/NotFoundView.vue'), meta: { titleKey: 'errors.notFoundTitle', layout: 'blank', public: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

export const homeRouteFor = (auth: ReturnType<typeof useAuthStore>): string => {
  if (auth.isStaff && auth.hasPermission('reports.read')) return '/dashboard';
  if (auth.hasRole('TEACHER')) return '/my';
  if (auth.hasRole('STUDENT')) return '/portal';
  if (auth.hasPermission('students.read')) return '/students';
  return '/notifications';
};

const canAccess = (auth: ReturnType<typeof useAuthStore>, route: RouteLocationNormalized): boolean => {
  const permissions = route.meta.permissions ?? [];
  const roles = route.meta.roles ?? [];
  if (roles.length > 0 && !auth.hasRole(...roles) && !auth.isSuperAdmin) {
    return false;
  }
  return permissions.length === 0 || auth.hasPermission(...permissions);
};

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.restore();
  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      return homeRouteFor(auth);
    }
    return true;
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' && to.fullPath !== '/home' ? { redirect: to.fullPath } : undefined };
  }
  if (!canAccess(auth, to)) {
    return { name: 'forbidden' };
  }
  return true;
});
