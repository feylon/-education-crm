export interface ApiEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors: string[];
  path: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  [key: string]: string | number | boolean | undefined;
}

export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'TEACHER' | 'CASHIER' | 'STUDENT' | string;
export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'DROPPED';
export type Gender = 'MALE' | 'FEMALE';
export type TeacherStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type SalaryType = 'FIXED' | 'PERCENT' | 'PER_LESSON';
export type CourseStatus = 'ACTIVE' | 'INACTIVE';
export type GroupStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type EnrollmentStatus = 'ACTIVE' | 'LEFT' | 'COMPLETED';
export type LessonStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CONTRACT';
export type PaymentStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED';
export type InvoiceStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REMINDER'
  | 'DEBT_REMINDER'
  | 'ATTENDANCE_MARKED'
  | 'STUDENT_CREATED'
  | 'GROUP_CHANGED'
  | 'GROUP_ENROLLMENT'
  | 'INVOICE_CREATED'
  | 'SYSTEM';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: RoleName[];
  permissions: string[];
  teacherId: string | null;
  studentId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult extends TokenPair {
  user: AuthUser;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  usersCount?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: Role[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  roomsCount?: number;
}

export interface Room {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  isActive: boolean;
  branch?: Branch;
}

export interface CourseCategory {
  id: string;
  name: string;
  description: string | null;
  coursesCount?: number;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: CourseCategory | null;
  durationMonths: number;
  price: number;
  status: CourseStatus;
  color: string | null;
  groupsCount?: number;
  groups?: Group[];
  createdAt: string;
}

export interface Parent {
  id: string;
  fullName: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

export interface Student {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  phone: string;
  email: string | null;
  passportSeries: string | null;
  passportNumber: string | null;
  address: string | null;
  photoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: StudentStatus;
  notes: string | null;
  branchId: string | null;
  branch?: Branch | null;
  parents?: Parent[];
  enrollments?: Enrollment[];
  createdAt: string;
}

export interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  specialization: string | null;
  bio: string | null;
  photoUrl: string | null;
  hireDate: string | null;
  salaryType: SalaryType;
  salaryAmount: number;
  status: TeacherStatus;
  branchId: string | null;
  user?: Pick<User, 'id' | 'email' | 'isActive'>;
  branch?: Branch | null;
  groupsCount?: number;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  course?: Course;
  teacherId: string | null;
  teacher?: Teacher | null;
  roomId: string | null;
  room?: Room | null;
  branchId: string | null;
  branch?: Branch | null;
  startDate: string;
  endDate: string | null;
  monthlyFee: number;
  capacity: number;
  status: GroupStatus;
  description: string | null;
  studentsCount?: number;
  schedules?: Schedule[];
  createdAt: string;
}

export interface Enrollment {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  leftAt: string | null;
  discountPercent: number;
  status: EnrollmentStatus;
  notes: string | null;
  student?: Student;
  group?: Group;
}

export interface Schedule {
  id: string;
  groupId: string;
  roomId: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  group?: Group;
  room?: Room | null;
}

export interface ScheduleConflict {
  kind: 'TEACHER' | 'ROOM' | 'GROUP';
  scheduleId?: string;
  groupId: string;
  groupName?: string;
  startTime?: string;
  endTime?: string;
}

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: ScheduleConflict[];
}

export interface CalendarEvent {
  id: string;
  kind: 'LESSON' | 'SLOT';
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  groupId: string;
  groupName: string;
  courseName: string | null;
  color: string | null;
  teacherId: string | null;
  teacherName: string | null;
  roomId: string | null;
  roomName: string | null;
  status: LessonStatus | null;
  topic: string | null;
  scheduleId: string | null;
}

export interface CalendarView {
  from: string;
  to: string;
  events: CalendarEvent[];
}

export interface Lesson {
  id: string;
  groupId: string;
  scheduleId: string | null;
  teacherId: string | null;
  roomId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  status: LessonStatus;
  markedCount?: number;
  group?: Group;
  teacher?: Teacher | null;
  room?: Room | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export interface AttendanceRecord {
  id: string;
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  lesson?: Lesson;
  createdAt: string;
}

export interface LessonSheetRow {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string | null;
  enrollmentStatus: EnrollmentStatus;
  status: AttendanceStatus | null;
  note: string | null;
}

export interface LessonSheet {
  lesson: Lesson;
  rows: LessonSheetRow[];
}

export interface GroupJournal {
  lessons: Lesson[];
  students: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    cells: Array<{ lessonId: string; status: AttendanceStatus | null }>;
    attendanceRate: number;
  }>;
}

export interface Invoice {
  id: string;
  number: string;
  studentId: string;
  groupId: string | null;
  enrollmentId: string | null;
  periodMonth: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string | null;
  student?: Student;
  group?: Group | null;
  allocations?: Array<{ id: string; amount: number; payment?: Payment }>;
  createdAt: string;
}

export interface Payment {
  id: string;
  number: string;
  studentId: string;
  invoiceId: string | null;
  groupId: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  description: string | null;
  receivedById: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  student?: Student;
  group?: Group | null;
  invoice?: Invoice | null;
  allocations?: Array<{ id: string; amount: number; invoice?: Invoice }>;
  createdAt: string;
}

export interface StudentFinanceSummary {
  studentId: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  debt: number;
  openInvoices: number;
  overdueInvoices: number;
  lastPaymentAt: string | null;
}

export interface Debtor {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string | null;
  totalInvoiced: number;
  totalPaid: number;
  debt: number;
  overdueInvoices: number;
  oldestDueDate: string | null;
  groups: string[];
}

export interface StudentProfile {
  student: Student;
  enrollments: Enrollment[];
  attendance: AttendanceSummary & { recent: AttendanceRecord[] };
  finance: {
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    debt: number;
    openInvoices: number;
    recentPayments: Payment[];
    recentInvoices: Invoice[];
  };
}

export interface TeacherProfile {
  teacher: Teacher;
  groups: Group[];
  schedule: Schedule[];
  statistics: {
    activeGroups: number;
    students: number;
    lessonsThisMonth: number;
    lessonsTotal: number;
    attendance: AttendanceSummary;
  };
}

export interface TeacherDashboard extends TeacherProfile {
  todayLessons: Lesson[];
  upcomingLessons: Lesson[];
  unmarkedLessons: Lesson[];
}

export interface GroupStatistics {
  students: { active: number; left: number; completed: number; capacity: number; fillRate: number };
  lessons: { total: number; completed: number; planned: number; cancelled: number };
  attendance: AttendanceSummary;
  finance: { invoiced: number; paid: number; debt: number; openInvoices: number };
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardData {
  counters: { students: number; activeStudents: number; teachers: number; groups: number; activeGroups: number; courses: number };
  today: {
    lessons: number;
    lessonsCompleted: number;
    attendance: AttendanceSummary;
    payments: { total: number; count: number };
    newStudents: number;
  };
  month: { revenue: number; paymentsCount: number; invoiced: number; newStudents: number; attendanceRate: number };
  debt: { total: number; debtors: number; overdueInvoices: number };
  charts: {
    revenueByMonth: Array<{ period: string; value: number }>;
    attendanceByMonth: Array<{ period: string; rate: number }>;
    studentsByStatus: Array<{ status: StudentStatus; count: number }>;
    paymentsByMethod: Array<{ method: string; total: number }>;
    newStudentsByMonth: Array<{ period: string; value: number }>;
    topGroupsByStudents: Array<{ groupId: string; groupName: string; students: number }>;
  };
  recentActivity: AuditLog[];
  upcomingLessons: Lesson[];
}

export interface RevenueReport {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  total: number;
  count: number;
  series: Array<{ period: string; value: number; count: number }>;
  byMethod: Array<{ method: PaymentMethod; total: number; count: number }>;
  byGroup: Array<{ groupId: string; groupName: string; total: number }>;
}

export interface AttendanceReport {
  from: string;
  to: string;
  summary: AttendanceSummary;
  series: Array<{ period: string; summary: AttendanceSummary }>;
  byGroup: Array<{ groupId: string; groupName: string; summary: AttendanceSummary }>;
}

export interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  url: string;
  createdAt: string;
}

export interface GenerationResult {
  created: number;
  skipped: number;
  from: string;
  to: string;
  groups: number;
}

export interface InvoiceGenerationResult {
  periodMonth: string;
  created: number;
  skipped: number;
  totalAmount: number;
}
