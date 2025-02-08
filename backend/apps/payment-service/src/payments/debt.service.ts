import { computeBalance, roundMoney } from '@app/common/domain';
import { DebtorsQueryDto } from '@app/common/dto';
import { InvoiceStatus, PaymentStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { toPaginated } from '@app/common/utils';
import { Invoice, Payment, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScopeService } from './scope.service';

export interface StudentFinanceSummary {
  studentId: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  debt: number;
  openInvoices: number;
  overdueInvoices: number;
  lastPaymentAt: Date | null;
}

export interface DebtorRow {
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

export interface GroupFinanceSummary {
  groupId: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  debtors: number;
}

const OPEN = [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE];

@Injectable()
export class DebtService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly scope: ScopeService,
  ) {}

  async studentSummary(studentId: string, meta: RequestMeta): Promise<StudentFinanceSummary> {
    await this.scope.assertStudentAccess(studentId, meta);
    const [invoiced, paid, openInvoices, overdueInvoices, lastPayment] = await Promise.all([
      this.invoices
        .createQueryBuilder('invoice')
        .select('COALESCE(SUM(invoice.amount), 0)', 'total')
        .where('invoice.studentId = :studentId AND invoice.status != :cancelled', { studentId, cancelled: InvoiceStatus.CANCELLED })
        .getRawOne<{ total: string }>(),
      this.payments
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.studentId = :studentId AND payment.status = :completed', { studentId, completed: PaymentStatus.COMPLETED })
        .getRawOne<{ total: string }>(),
      this.invoices.createQueryBuilder('invoice').where('invoice.studentId = :studentId AND invoice.status IN (:...open)', { studentId, open: OPEN }).getCount(),
      this.invoices.count({ where: { studentId, status: InvoiceStatus.OVERDUE } }),
      this.payments.findOne({ where: { studentId, status: PaymentStatus.COMPLETED }, order: { paidAt: 'DESC' } }),
    ]);
    const totalInvoiced = roundMoney(Number(invoiced?.total ?? 0));
    const totalPaid = roundMoney(Number(paid?.total ?? 0));
    return {
      studentId,
      totalInvoiced,
      totalPaid,
      ...computeBalance(totalPaid, totalInvoiced),
      openInvoices,
      overdueInvoices,
      lastPaymentAt: lastPayment?.paidAt ?? null,
    };
  }

  async debtors(query: DebtorsQueryDto, meta: RequestMeta): Promise<Paginated<DebtorRow>> {
    this.scope.assertStaff(meta);
    const minDebt = query.minDebt ?? 0;
    const qb = this.students
      .createQueryBuilder('student')
      .innerJoin(
        (sub) =>
          sub
            .select('inv."studentId"', 'studentId')
            .addSelect('SUM(inv.amount)', 'totalInvoiced')
            .addSelect('SUM(inv."paidAmount")', 'totalPaid')
            .addSelect('SUM(inv.amount - inv."paidAmount")', 'debt')
            .addSelect("COUNT(CASE WHEN inv.status = 'OVERDUE' THEN 1 END)", 'overdueInvoices')
            .addSelect('MIN(inv."dueDate")', 'oldestDueDate')
            .from(Invoice, 'inv')
            .where('inv.status IN (:...open)', { open: OPEN })
            .andWhere(query.groupId ? 'inv."groupId" = :groupId' : '1=1', { groupId: query.groupId })
            .groupBy('inv."studentId"'),
        'debt',
        'debt."studentId" = student.id',
      )
      .leftJoin('student.enrollments', 'enrollment', "enrollment.status = 'ACTIVE'")
      .leftJoin('enrollment.group', 'group')
      .select('student.id', 'studentId')
      .addSelect('student.firstName', 'firstName')
      .addSelect('student.lastName', 'lastName')
      .addSelect('student.phone', 'phone')
      .addSelect('student.photoUrl', 'photoUrl')
      .addSelect('debt."totalInvoiced"', 'totalInvoiced')
      .addSelect('debt."totalPaid"', 'totalPaid')
      .addSelect('debt.debt', 'debt')
      .addSelect('debt."overdueInvoices"', 'overdueInvoices')
      .addSelect('debt."oldestDueDate"', 'oldestDueDate')
      .addSelect("COALESCE(ARRAY_AGG(DISTINCT group.name) FILTER (WHERE group.name IS NOT NULL), '{}')", 'groups')
      .where('debt.debt > :minDebt', { minDebt })
      .groupBy('student.id')
      .addGroupBy('debt."totalInvoiced"')
      .addGroupBy('debt."totalPaid"')
      .addGroupBy('debt.debt')
      .addGroupBy('debt."overdueInvoices"')
      .addGroupBy('debt."oldestDueDate"');
    if (query.search) {
      qb.andWhere('(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search)', { search: `%${query.search}%` });
    }
    const sortable: Record<string, string> = { debt: 'debt.debt', lastName: 'student.lastName', oldestDueDate: 'debt."oldestDueDate"' };
    qb.orderBy(sortable[query.sortBy ?? ''] ?? 'debt.debt', query.sortOrder ?? 'DESC');
    const total = await qb.getCount();
    const rows = await qb
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<Record<string, unknown>>();
    const items = rows.map<DebtorRow>((row) => ({
      studentId: String(row.studentId),
      firstName: String(row.firstName),
      lastName: String(row.lastName),
      phone: String(row.phone),
      photoUrl: (row.photoUrl as string | null) ?? null,
      totalInvoiced: roundMoney(Number(row.totalInvoiced)),
      totalPaid: roundMoney(Number(row.totalPaid)),
      debt: roundMoney(Number(row.debt)),
      overdueInvoices: Number(row.overdueInvoices),
      oldestDueDate: (row.oldestDueDate as string | null) ?? null,
      groups: (row.groups as string[]) ?? [],
    }));
    return toPaginated(items, total, query);
  }

  async groupSummary(groupId: string, meta: RequestMeta): Promise<GroupFinanceSummary> {
    await this.scope.assertGroupAccess(groupId, meta);
    const row = await this.invoices
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.amount), 0)', 'invoiced')
      .addSelect('COALESCE(SUM(invoice.paidAmount), 0)', 'paid')
      .addSelect('COUNT(DISTINCT CASE WHEN invoice.amount > invoice.paidAmount THEN invoice.studentId END)', 'debtors')
      .where('invoice.groupId = :groupId AND invoice.status != :cancelled', { groupId, cancelled: InvoiceStatus.CANCELLED })
      .getRawOne<{ invoiced: string; paid: string; debtors: string }>();
    const invoiced = roundMoney(Number(row?.invoiced ?? 0));
    const paid = roundMoney(Number(row?.paid ?? 0));
    return { groupId, invoiced, paid, outstanding: roundMoney(invoiced - paid), debtors: Number(row?.debtors ?? 0) };
  }
}
