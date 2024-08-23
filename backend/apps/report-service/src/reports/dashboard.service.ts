import { summarizeAttendance } from '@app/common/domain';
import { roundMoney } from '@app/common/domain/billing.util';
import { AttendanceStatus, CourseStatus, GroupStatus, InvoiceStatus, LessonStatus, PaymentStatus, StudentStatus, TeacherStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { addMonths, startOfMonth, toDateOnly } from '@app/common/utils';
import { AttendanceRecord, AuditLog, Course, Group, GroupStudent, Invoice, Lesson, Payment, Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReportsService } from './reports.service';

export interface DashboardData {
  counters: { students: number; activeStudents: number; teachers: number; groups: number; activeGroups: number; courses: number };
  today: {
    lessons: number;
    lessonsCompleted: number;
    attendance: ReturnType<typeof summarizeAttendance>;
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

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    private readonly reports: ReportsService,
  ) {}

  async build(_meta: RequestMeta): Promise<DashboardData> {
    const now = new Date();
    const today = toDateOnly(now);
    const monthStart = toDateOnly(startOfMonth(now));
    const yearAgo = toDateOnly(startOfMonth(addMonths(now, -11)));
    const [
      students,
      activeStudents,
      teachers,
      groups,
      activeGroups,
      courses,
      todayLessons,
      todayCompleted,
      todayStatuses,
      todayPayments,
      todayNewStudents,
      monthPayments,
      monthInvoiced,
      monthNewStudents,
      monthStatuses,
      debtRow,
      overdueInvoices,
      revenue,
      attendanceReport,
      studentsReport,
      topGroups,
      recentActivity,
      upcomingLessons,
    ] = await Promise.all([
      this.students.count(),
      this.students.count({ where: { status: StudentStatus.ACTIVE } }),
      this.teachers.count({ where: { status: In([TeacherStatus.ACTIVE, TeacherStatus.ON_LEAVE]) } }),
      this.groups.count(),
      this.groups.count({ where: { status: GroupStatus.ACTIVE } }),
      this.courses.count({ where: { status: CourseStatus.ACTIVE } }),
      this.lessons.count({ where: { date: today } }),
      this.lessons.count({ where: { date: today, status: LessonStatus.COMPLETED } }),
      this.attendance
        .createQueryBuilder('record')
        .innerJoin('record.lesson', 'lesson')
        .select('record.status', 'status')
        .where('lesson.date = :today', { today })
        .getRawMany<{ status: AttendanceStatus }>(),
      this.sumPayments(today, today),
      this.students.createQueryBuilder('student').where('student.createdAt >= :today', { today }).getCount(),
      this.sumPayments(monthStart, today),
      this.invoices
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.amount), 0)', 'total')
        .where('invoice.periodMonth = :monthStart AND invoice.status != :cancelled', { monthStart, cancelled: InvoiceStatus.CANCELLED })
        .getRawOne<{ total: string }>(),
      this.students.createQueryBuilder('student').where('student.createdAt >= :monthStart', { monthStart }).getCount(),
      this.attendance
        .createQueryBuilder('record')
        .innerJoin('record.lesson', 'lesson')
        .select('record.status', 'status')
        .where('lesson.date BETWEEN :monthStart AND :today', { monthStart, today })
        .getRawMany<{ status: AttendanceStatus }>(),
      this.invoices
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.amount - invoice.paidAmount), 0)', 'total')
        .addSelect('COUNT(DISTINCT invoice.studentId)', 'debtors')
        .where('invoice.status IN (:...open)', { open: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] })
        .andWhere('invoice.amount > invoice.paidAmount')
        .getRawOne<{ total: string; debtors: string }>(),
      this.invoices.count({ where: { status: InvoiceStatus.OVERDUE } }),
      this.reports.revenue({ from: yearAgo, to: today, groupBy: 'month' }),
      this.reports.attendanceReport({ from: yearAgo, to: today, groupBy: 'month' }),
      this.reports.studentsReport({ from: yearAgo, to: today }),
      this.enrollments
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.group', 'group')
        .select('group.id', 'groupId')
        .addSelect('group.name', 'groupName')
        .addSelect('COUNT(*)', 'students')
        .where("enrollment.status = 'ACTIVE'")
        .groupBy('group.id')
        .addGroupBy('group.name')
        .orderBy('students', 'DESC')
        .limit(6)
        .getRawMany<{ groupId: string; groupName: string; students: string }>(),
      this.reports.recentActivity(10),
      this.lessons.find({
        where: { date: today, status: LessonStatus.PLANNED },
        relations: { group: true, teacher: true, room: true },
        order: { startTime: 'ASC' },
        take: 8,
      }),
    ]);
    return {
      counters: { students, activeStudents, teachers, groups, activeGroups, courses },
      today: {
        lessons: todayLessons,
        lessonsCompleted: todayCompleted,
        attendance: summarizeAttendance(todayStatuses.map((row) => row.status)),
        payments: todayPayments,
        newStudents: todayNewStudents,
      },
      month: {
        revenue: monthPayments.total,
        paymentsCount: monthPayments.count,
        invoiced: roundMoney(Number(monthInvoiced?.total ?? 0)),
        newStudents: monthNewStudents,
        attendanceRate: summarizeAttendance(monthStatuses.map((row) => row.status)).attendanceRate,
      },
      debt: { total: roundMoney(Number(debtRow?.total ?? 0)), debtors: Number(debtRow?.debtors ?? 0), overdueInvoices },
      charts: {
        revenueByMonth: revenue.series.map((point) => ({ period: point.period, value: point.value })),
        attendanceByMonth: attendanceReport.series.map((point) => ({ period: point.period, rate: point.summary.attendanceRate })),
        studentsByStatus: studentsReport.byStatus,
        paymentsByMethod: revenue.byMethod.map((row) => ({ method: row.method, total: row.total })),
        newStudentsByMonth: studentsReport.newPerMonth.map((point) => ({ period: point.period, value: point.value })),
        topGroupsByStudents: topGroups.map((row) => ({ groupId: row.groupId, groupName: row.groupName, students: Number(row.students) })),
      },
      recentActivity,
      upcomingLessons,
    };
  }

  private async sumPayments(from: string, to: string): Promise<{ total: number; count: number }> {
    const row = await this.payments
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('payment.status = :completed', { completed: PaymentStatus.COMPLETED })
      .andWhere('payment.paidAt >= :from AND payment.paidAt < CAST(:to AS DATE) + INTERVAL \'1 day\'', { from, to })
      .getRawOne<{ total: string; count: string }>();
    return { total: roundMoney(Number(row?.total ?? 0)), count: Number(row?.count ?? 0) };
  }
}
