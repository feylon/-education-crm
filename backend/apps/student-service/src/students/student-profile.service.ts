import { summarizeAttendance } from '@app/common/domain';
import { computeBalance, roundMoney } from '@app/common/domain/billing.util';
import { AttendanceStatus, InvoiceStatus, PaymentStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { AttendanceRecord, GroupStudent, Invoice, Payment, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentsService } from './students.service';

export interface StudentProfile {
  student: Student;
  enrollments: GroupStudent[];
  attendance: ReturnType<typeof summarizeAttendance> & { recent: AttendanceRecord[] };
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

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly students: StudentsService,
  ) {}

  async build(id: string, meta: RequestMeta): Promise<StudentProfile> {
    const student = await this.students.findOne(id, meta);
    const [enrollments, statuses, recentAttendance, invoiceTotals, paymentTotals, recentPayments, recentInvoices, openInvoices] =
      await Promise.all([
        this.enrollments.find({
          where: { studentId: id },
          relations: { group: { course: true, teacher: true, room: true } },
          order: { joinedAt: 'DESC' },
        }),
        this.attendance
          .createQueryBuilder('record')
          .select('record.status', 'status')
          .where('record.studentId = :id', { id })
          .getRawMany<{ status: AttendanceStatus }>(),
        this.attendance.find({
          where: { studentId: id },
          relations: { lesson: { group: true } },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.invoices
          .createQueryBuilder('invoice')
          .select('COALESCE(SUM(invoice.amount), 0)', 'total')
          .where('invoice.studentId = :id AND invoice.status != :cancelled', { id, cancelled: InvoiceStatus.CANCELLED })
          .getRawOne<{ total: string }>(),
        this.payments
          .createQueryBuilder('payment')
          .select('COALESCE(SUM(payment.amount), 0)', 'total')
          .where('payment.studentId = :id AND payment.status = :completed', { id, completed: PaymentStatus.COMPLETED })
          .getRawOne<{ total: string }>(),
        this.payments.find({ where: { studentId: id }, relations: { group: true }, order: { paidAt: 'DESC' }, take: 10 }),
        this.invoices.find({ where: { studentId: id }, relations: { group: true }, order: { periodMonth: 'DESC' }, take: 12 }),
        this.invoices.count({
          where: { studentId: id, status: In([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]) },
        }),
      ]);
    const totalInvoiced = roundMoney(Number(invoiceTotals?.total ?? 0));
    const totalPaid = roundMoney(Number(paymentTotals?.total ?? 0));
    return {
      student,
      enrollments,
      attendance: { ...summarizeAttendance(statuses.map((row) => row.status)), recent: recentAttendance },
      finance: {
        totalInvoiced,
        totalPaid,
        ...computeBalance(totalPaid, totalInvoiced),
        openInvoices,
        recentPayments,
        recentInvoices,
      },
    };
  }
}
