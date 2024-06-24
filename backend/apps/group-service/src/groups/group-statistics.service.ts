import { summarizeAttendance } from '@app/common/domain';
import { roundMoney } from '@app/common/domain/billing.util';
import { AttendanceStatus, EnrollmentStatus, InvoiceStatus, LessonStatus, PaymentStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { toDateOnly } from '@app/common/utils';
import { AttendanceRecord, GroupStudent, Invoice, Lesson, Payment } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupsService } from './groups.service';

export interface GroupStatistics {
  students: { active: number; left: number; completed: number; capacity: number; fillRate: number };
  lessons: { total: number; completed: number; planned: number; cancelled: number };
  attendance: ReturnType<typeof summarizeAttendance>;
  finance: { invoiced: number; paid: number; debt: number; openInvoices: number };
}

@Injectable()
export class GroupStatisticsService {
  constructor(
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly groups: GroupsService,
  ) {}

  async build(groupId: string, meta: RequestMeta): Promise<GroupStatistics> {
    const group = await this.groups.findOne(groupId, meta);
    const [enrollmentRows, lessonRows, statuses, invoiceRow, paidRow, openInvoices] = await Promise.all([
      this.enrollments
        .createQueryBuilder('enrollment')
        .select('enrollment.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('enrollment.groupId = :groupId', { groupId })
        .groupBy('enrollment.status')
        .getRawMany<{ status: EnrollmentStatus; count: string }>(),
      this.lessons
        .createQueryBuilder('lesson')
        .select('lesson.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('lesson.groupId = :groupId', { groupId })
        .groupBy('lesson.status')
        .getRawMany<{ status: LessonStatus; count: string }>(),
      this.attendance
        .createQueryBuilder('record')
        .innerJoin('record.lesson', 'lesson')
        .select('record.status', 'status')
        .where('lesson.groupId = :groupId', { groupId })
        .getRawMany<{ status: AttendanceStatus }>(),
      this.invoices
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.amount), 0)', 'invoiced')
        .addSelect('COALESCE(SUM(invoice.paidAmount), 0)', 'paidOnInvoices')
        .where('invoice.groupId = :groupId AND invoice.status != :cancelled', { groupId, cancelled: InvoiceStatus.CANCELLED })
        .getRawOne<{ invoiced: string; paidOnInvoices: string }>(),
      this.payments
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'paid')
        .where('payment.groupId = :groupId AND payment.status = :completed', { groupId, completed: PaymentStatus.COMPLETED })
        .getRawOne<{ paid: string }>(),
      this.invoices
        .createQueryBuilder('invoice')
        .where('invoice.groupId = :groupId', { groupId })
        .andWhere('invoice.status IN (:...open)', { open: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] })
        .andWhere('invoice.dueDate <= :today', { today: toDateOnly(new Date()) })
        .getCount(),
    ]);
    const countOf = <T extends string>(rows: { status: T; count: string }[], status: T): number =>
      Number(rows.find((row) => row.status === status)?.count ?? 0);
    const active = countOf(enrollmentRows, EnrollmentStatus.ACTIVE);
    const invoiced = roundMoney(Number(invoiceRow?.invoiced ?? 0));
    const paidOnInvoices = roundMoney(Number(invoiceRow?.paidOnInvoices ?? 0));
    const lessonsTotal = lessonRows.reduce((sum, row) => sum + Number(row.count), 0);
    return {
      students: {
        active,
        left: countOf(enrollmentRows, EnrollmentStatus.LEFT),
        completed: countOf(enrollmentRows, EnrollmentStatus.COMPLETED),
        capacity: group.capacity,
        fillRate: group.capacity ? Math.round((active / group.capacity) * 100) : 0,
      },
      lessons: {
        total: lessonsTotal,
        completed: countOf(lessonRows, LessonStatus.COMPLETED),
        planned: countOf(lessonRows, LessonStatus.PLANNED),
        cancelled: countOf(lessonRows, LessonStatus.CANCELLED),
      },
      attendance: summarizeAttendance(statuses.map((row) => row.status)),
      finance: {
        invoiced,
        paid: roundMoney(Number(paidRow?.paid ?? 0)),
        debt: roundMoney(Math.max(0, invoiced - paidOnInvoices)),
        openInvoices,
      },
    };
  }
}
