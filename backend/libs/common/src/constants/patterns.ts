export const AUTH_PATTERNS = {
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
  ME: 'auth.me',
  CHANGE_PASSWORD: 'auth.changePassword',
} as const;

export const USER_PATTERNS = {
  FIND_ALL: 'users.findAll',
  FIND_ONE: 'users.findOne',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  REMOVE: 'users.remove',
  ROLES_FIND_ALL: 'roles.findAll',
  ROLES_FIND_ONE: 'roles.findOne',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_REMOVE: 'roles.remove',
  PERMISSIONS_FIND_ALL: 'permissions.findAll',
  AUDIT_FIND_ALL: 'audit.findAll',
} as const;

export const STUDENT_PATTERNS = {
  FIND_ALL: 'students.findAll',
  FIND_ONE: 'students.findOne',
  PROFILE: 'students.profile',
  CREATE: 'students.create',
  UPDATE: 'students.update',
  REMOVE: 'students.remove',
  PARENTS_ADD: 'students.parents.add',
  PARENTS_UPDATE: 'students.parents.update',
  PARENTS_REMOVE: 'students.parents.remove',
  ME: 'students.me',
  LOOKUP: 'students.lookup',
} as const;

export const TEACHER_PATTERNS = {
  FIND_ALL: 'teachers.findAll',
  FIND_ONE: 'teachers.findOne',
  PROFILE: 'teachers.profile',
  CREATE: 'teachers.create',
  UPDATE: 'teachers.update',
  REMOVE: 'teachers.remove',
  ME: 'teachers.me',
  DASHBOARD: 'teachers.dashboard',
  LOOKUP: 'teachers.lookup',
} as const;

export const COURSE_PATTERNS = {
  FIND_ALL: 'courses.findAll',
  FIND_ONE: 'courses.findOne',
  CREATE: 'courses.create',
  UPDATE: 'courses.update',
  REMOVE: 'courses.remove',
  CATEGORIES_FIND_ALL: 'courses.categories.findAll',
  CATEGORIES_CREATE: 'courses.categories.create',
  CATEGORIES_UPDATE: 'courses.categories.update',
  CATEGORIES_REMOVE: 'courses.categories.remove',
} as const;

export const GROUP_PATTERNS = {
  FIND_ALL: 'groups.findAll',
  FIND_ONE: 'groups.findOne',
  CREATE: 'groups.create',
  UPDATE: 'groups.update',
  REMOVE: 'groups.remove',
  ENROLL: 'groups.enroll',
  UNENROLL: 'groups.unenroll',
  UPDATE_ENROLLMENT: 'groups.updateEnrollment',
  STUDENTS: 'groups.students',
  STATISTICS: 'groups.statistics',
  LOOKUP: 'groups.lookup',
} as const;

export const SCHEDULE_PATTERNS = {
  FIND_ALL: 'schedules.findAll',
  FIND_ONE: 'schedules.findOne',
  CREATE: 'schedules.create',
  UPDATE: 'schedules.update',
  REMOVE: 'schedules.remove',
  CALENDAR: 'schedules.calendar',
  CHECK_CONFLICTS: 'schedules.checkConflicts',
  ROOMS_FIND_ALL: 'rooms.findAll',
  ROOMS_CREATE: 'rooms.create',
  ROOMS_UPDATE: 'rooms.update',
  ROOMS_REMOVE: 'rooms.remove',
  BRANCHES_FIND_ALL: 'branches.findAll',
  BRANCHES_CREATE: 'branches.create',
  BRANCHES_UPDATE: 'branches.update',
  BRANCHES_REMOVE: 'branches.remove',
} as const;

export const ATTENDANCE_PATTERNS = {
  LESSONS_FIND_ALL: 'lessons.findAll',
  LESSONS_FIND_ONE: 'lessons.findOne',
  LESSONS_CREATE: 'lessons.create',
  LESSONS_UPDATE: 'lessons.update',
  LESSONS_GENERATE: 'lessons.generate',
  MARK: 'attendance.mark',
  LESSON_SHEET: 'attendance.lessonSheet',
  GROUP_JOURNAL: 'attendance.groupJournal',
  STUDENT_STATS: 'attendance.studentStats',
  GROUP_STATS: 'attendance.groupStats',
  TEACHER_STATS: 'attendance.teacherStats',
  MONTHLY_STATS: 'attendance.monthlyStats',
  STUDENT_HISTORY: 'attendance.studentHistory',
} as const;

export const PAYMENT_PATTERNS = {
  FIND_ALL: 'payments.findAll',
  FIND_ONE: 'payments.findOne',
  CREATE: 'payments.create',
  REFUND: 'payments.refund',
  CANCEL: 'payments.cancel',
  STUDENT_SUMMARY: 'payments.studentSummary',
  STUDENT_HISTORY: 'payments.studentHistory',
  DEBTORS: 'payments.debtors',
  INVOICES_FIND_ALL: 'invoices.findAll',
  INVOICES_FIND_ONE: 'invoices.findOne',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_UPDATE: 'invoices.update',
  INVOICES_CANCEL: 'invoices.cancel',
  INVOICES_GENERATE: 'invoices.generate',
  GROUP_SUMMARY: 'payments.groupSummary',
} as const;

export const NOTIFICATION_PATTERNS = {
  FIND_ALL: 'notifications.findAll',
  UNREAD_COUNT: 'notifications.unreadCount',
  MARK_READ: 'notifications.markRead',
  MARK_ALL_READ: 'notifications.markAllRead',
  SEND: 'notifications.send',
  REMOVE: 'notifications.remove',
} as const;

export const REPORT_PATTERNS = {
  DASHBOARD: 'reports.dashboard',
  REVENUE: 'reports.revenue',
  ATTENDANCE: 'reports.attendance',
  STUDENTS: 'reports.students',
  RECENT_ACTIVITY: 'reports.recentActivity',
} as const;

export const FILE_PATTERNS = {
  UPLOAD: 'files.upload',
  GET: 'files.get',
  REMOVE: 'files.remove',
} as const;
