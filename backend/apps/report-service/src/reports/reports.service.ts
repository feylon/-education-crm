import { summarizeAttendance } from '@app/common/domain';
import { roundMoney } from '@app/common/domain/billing.util';
import { ReportRangeQueryDto } from '@app/common/dto';
import { AttendanceStatus, PaymentMethod, PaymentStatus, StudentStatus } from '@app/common/enums';
import { addMonths, startOfMonth, toDateOnly } from '@app/common/utils';
import { AttendanceRecord, AuditLog, Payment, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface SeriesPoint {
  period: string;
  value: number;
  count: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  total: number;
  count: number;
  series: SeriesPoint[];
  byMethod: Array<{ method: PaymentMethod; total: number; count: number }>;
  byGroup: Array<{ groupId: string; groupName: string; total: number }>;
}

export interface AttendanceReport {
  from: string;
  to: string;
  summary: ReturnType<typeof summarizeAttendance>;
  series: Array<{ period: string; summary: ReturnType<typeof summarizeAttendance> }>;
  byGroup: Array<{ groupId: string; groupName: string; summary: ReturnType<typeof summarizeAttendance> }>;
}

export interface StudentsReport {
  from: string;
  to: string;
  total: number;
  byStatus: Array<{ status: StudentStatus; count: number }>;
  newPerMonth: SeriesPoint[];
  byGender: Array<{ gender: string; count: number }>;
}

const periodExpression = (column: string, groupBy: 'day' | 'month'): string =>
  groupBy === 'day' ? `TO_CHAR(${column}, 'YYYY-MM-DD')` : `TO_CHAR(${column}, 'YYYY-MM')`;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(AuditLog) private readonly audit: Repository<AuditLog>,
  ) {}

  resolveRange(query: ReportRangeQueryDto): { from: string; to: string } {
    const to = query.to ?? toDateOnly(new Date());
    const from = query.from ?? toDateOnly(startOfMonth(addMonths(new Date(to), -11)));
    return { from, to };
  }

  async revenue(query: ReportRangeQueryDto): Promise<RevenueReport> {
    const { from, to } = this.resolveRange(query);
    const groupBy = query.groupBy ?? 'month';
    const base = () => {
      const qb = this.payments
        .createQueryBuilder('payment')
        .leftJoin('payment.group', 'group')
        .where('payment.status = :completed', { completed: PaymentStatus.COMPLETED })
        .andWhere('payment.paidAt >= :from AND payment.paidAt < CAST(:to AS DATE) + INTERVAL \'1 day\'', { from, to });
      if (query.groupId) qb.andWhere('payment.groupId = :groupId', { groupId: query.groupId });
      if (query.branchId) qb.andWhere('group.branchId = :branchId', { branchId: query.branchId });
      return qb;
    };
    const [series, byMethod, byGroup] = await Promise.all([
      base()
        .select(periodExpression('payment.paidAt', groupBy), 'period')
        .addSelect('SUM(payment.amount)', 'value')
        .addSelect('COUNT(*)', 'count')
        .groupBy('period')
        .orderBy('period', 'ASC')
        .getRawMany<{ period: string; value: string; count: string }>(),
      base()
        .select('payment.method', 'method')
        .addSelect('SUM(payment.amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .groupBy('payment.method')
        .getRawMany<{ method: PaymentMethod; total: string; count: string }>(),
      base()
        .select('group.id', 'groupId')
        .addSelect('group.name', 'groupName')
        .addSelect('SUM(payment.amount)', 'total')
        .groupBy('group.id')
        .addGroupBy('group.name')
        .orderBy('total', 'DESC')
        .limit(10)
        .getRawMany<{ groupId: string | null; groupName: string | null; total: string }>(),
    ]);
    const points = series.map((row) => ({ period: row.period, value: roundMoney(Number(row.value)), count: Number(row.count) }));
    return {
      from,
      to,
      groupBy,
      total: roundMoney(points.reduce((sum, point) => sum + point.value, 0)),
      count: points.reduce((sum, point) => sum + point.count, 0),
      series: points,
      byMethod: byMethod.map((row) => ({ method: row.method, total: roundMoney(Number(row.total)), count: Number(row.count) })),
      byGroup: byGroup
        .filter((row) => row.groupId)
        .map((row) => ({ groupId: row.groupId as string, groupName: row.groupName ?? '', total: roundMoney(Number(row.total)) })),
    };
  }

  async attendanceReport(query: ReportRangeQueryDto): Promise<AttendanceReport> {
    const { from, to } = this.resolveRange(query);
    const groupBy = query.groupBy ?? 'month';
    const qb = this.attendance
      .createQueryBuilder('record')
      .innerJoin('record.lesson', 'lesson')
      .innerJoin('lesson.group', 'group')
      .select('record.status', 'status')
      .addSelect(periodExpression('lesson.date', groupBy), 'period')
      .addSelect('group.id', 'groupId')
      .addSelect('group.name', 'groupName')
      .where('lesson.date BETWEEN :from AND :to', { from, to });
    if (query.groupId) qb.andWhere('group.id = :groupId', { groupId: query.groupId });
    if (query.branchId) qb.andWhere('group.branchId = :branchId', { branchId: query.branchId });
    const rows = await qb.getRawMany<{ status: AttendanceStatus; period: string; groupId: string; groupName: string }>();
    const periods = [...new Set(rows.map((row) => row.period))].sort();
    const groups = new Map<string, { groupName: string; statuses: AttendanceStatus[] }>();
    for (const row of rows) {
      const entry = groups.get(row.groupId) ?? { groupName: row.groupName, statuses: [] };
      entry.statuses.push(row.status);
      groups.set(row.groupId, entry);
    }
    return {
      from,
      to,
      summary: summarizeAttendance(rows.map((row) => row.status)),
      series: periods.map((period) => ({ period, summary: summarizeAttendance(rows.filter((row) => row.period === period).map((row) => row.status)) })),
      byGroup: [...groups.entries()]
        .map(([groupId, entry]) => ({ groupId, groupName: entry.groupName, summary: summarizeAttendance(entry.statuses) }))
        .sort((a, b) => a.summary.attendanceRate - b.summary.attendanceRate),
    };
  }

  async studentsReport(query: ReportRangeQueryDto): Promise<StudentsReport> {
    const { from, to } = this.resolveRange(query);
    const [byStatus, newPerMonth, byGender, total] = await Promise.all([
      this.students
        .createQueryBuilder('student')
        .select('student.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('student.status')
        .getRawMany<{ status: StudentStatus; count: string }>(),
      this.students
        .createQueryBuilder('student')
        .select("TO_CHAR(student.createdAt, 'YYYY-MM')", 'period')
        .addSelect('COUNT(*)', 'count')
        .where('student.createdAt >= :from AND student.createdAt < CAST(:to AS DATE) + INTERVAL \'1 day\'', { from, to })
        .groupBy('period')
        .orderBy('period', 'ASC')
        .getRawMany<{ period: string; count: string }>(),
      this.students
        .createQueryBuilder('student')
        .select("COALESCE(CAST(student.gender AS TEXT), 'UNKNOWN')", 'gender')
        .addSelect('COUNT(*)', 'count')
        .groupBy('gender')
        .getRawMany<{ gender: string; count: string }>(),
      this.students.count(),
    ]);
    return {
      from,
      to,
      total,
      byStatus: byStatus.map((row) => ({ status: row.status, count: Number(row.count) })),
      newPerMonth: newPerMonth.map((row) => ({ period: row.period, value: Number(row.count), count: Number(row.count) })),
      byGender: byGender.map((row) => ({ gender: row.gender, count: Number(row.count) })),
    };
  }

  recentActivity(limit = 15): Promise<AuditLog[]> {
    return this.audit.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
