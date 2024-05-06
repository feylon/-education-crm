export const EVENTS = {
  AUDIT_LOG: 'audit.log',
  USER_LOGGED_IN: 'user.loggedIn',
  STUDENT_CREATED: 'student.created',
  STUDENT_UPDATED: 'student.updated',
  STUDENT_DELETED: 'student.deleted',
  TEACHER_CREATED: 'teacher.created',
  GROUP_CREATED: 'group.created',
  GROUP_UPDATED: 'group.updated',
  GROUP_STUDENT_ENROLLED: 'group.studentEnrolled',
  GROUP_STUDENT_LEFT: 'group.studentLeft',
  ATTENDANCE_MARKED: 'attendance.marked',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_OVERDUE: 'invoice.overdue',
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
