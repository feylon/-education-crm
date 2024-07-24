import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { computeInvoiceAmount, resolveInvoiceStatus } from '@app/common/domain';
import { CreateInvoiceDto, GenerateInvoicesDto, InvoiceQueryDto, UpdateInvoiceDto } from '@app/common/dto';
import { AuditAction, EnrollmentStatus, GroupStatus, InvoiceStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, paginateQuery, startOfMonth, toDateOnly, translateDatabaseError } from '@app/common/utils';
import { Group, GroupStudent, Invoice, Student } from '@app/database';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { NumberingService } from './numbering.service';
import { ScopeService } from './scope.service';

export interface InvoiceGenerationResult {
  periodMonth: string;
  created: number;
  skipped: number;
  totalAmount: number;
}

const OPEN_STATUSES = [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE];

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly dataSource: DataSource,
    private readonly numbering: NumberingService,
    private readonly scope: ScopeService,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async findAll(query: InvoiceQueryDto, meta: RequestMeta): Promise<Paginated<Invoice>> {
    const qb = this.baseQuery();
    if (query.studentId) qb.andWhere('invoice.studentId = :studentId', { studentId: query.studentId });
    if (query.groupId) qb.andWhere('invoice.groupId = :groupId', { groupId: query.groupId });
    if (query.status) qb.andWhere('invoice.status = :status', { status: query.status });
    if (query.periodMonth) qb.andWhere('invoice.periodMonth = :periodMonth', { periodMonth: toDateOnly(startOfMonth(new Date(query.periodMonth))) });
    if (query.openOnly) qb.andWhere('invoice.status IN (:...open)', { open: OPEN_STATUSES });
    if (query.search) {
      qb.andWhere('(invoice.number ILIKE :search OR student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    await this.scope.applyStudentScope(qb, 'invoice', meta);
    applySorting(qb, 'invoice', query, ['createdAt', 'periodMonth', 'dueDate', 'amount', 'status', 'number'], 'periodMonth');
    return paginateQuery(qb, query);
  }

  async findOne(id: string, meta: RequestMeta): Promise<Invoice> {
    const qb = this.baseQuery()
      .leftJoinAndSelect('invoice.allocations', 'allocation')
      .leftJoinAndSelect('allocation.payment', 'payment')
      .where('invoice.id = :id', { id });
    await this.scope.applyStudentScope(qb, 'invoice', meta);
    const invoice = await qb.getOne();
    if (!invoice) {
      throw new RpcNotFoundException('Invoice not found');
    }
    return invoice;
  }

  async create(dto: CreateInvoiceDto, meta: RequestMeta): Promise<Invoice> {
    this.scope.assertStaff(meta);
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new RpcBadRequestException('Student does not exist');
    }
    if (dto.groupId && !(await this.groups.exist({ where: { id: dto.groupId } }))) {
      throw new RpcBadRequestException('Group does not exist');
    }
    const periodMonth = toDateOnly(startOfMonth(new Date(dto.periodMonth)));
    const enrollment = dto.groupId
      ? await this.enrollments.findOne({ where: { groupId: dto.groupId, studentId: dto.studentId } })
      : null;
    const invoice = await this.dataSource
      .transaction(async (manager) =>
        manager.getRepository(Invoice).save(
          manager.getRepository(Invoice).create({
            number: await this.numbering.next(manager, 'invoices', 'INV', new Date(periodMonth)),
            studentId: dto.studentId,
            groupId: dto.groupId ?? null,
            enrollmentId: enrollment?.id ?? null,
            periodMonth,
            amount: dto.amount,
            paidAmount: 0,
            dueDate: dto.dueDate,
            status: resolveInvoiceStatus({ amount: dto.amount, paidAmount: 0, dueDate: dto.dueDate, status: InvoiceStatus.PENDING }, toDateOnly(new Date())),
            description: dto.description ?? null,
          }),
        ),
      )
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Invoice', invoice.id, null, this.snapshot(invoice));
    this.emitCreated(invoice, student);
    return this.findOne(invoice.id, meta);
  }

  async update(id: string, dto: UpdateInvoiceDto, meta: RequestMeta): Promise<Invoice> {
    this.scope.assertStaff(meta);
    const invoice = await this.invoices.findOne({ where: { id } });
    if (!invoice) {
      throw new RpcNotFoundException('Invoice not found');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new RpcBadRequestException('Cancelled invoices cannot be edited');
    }
    if (dto.amount !== undefined && dto.amount < invoice.paidAmount) {
      throw new RpcBadRequestException('Amount cannot be lower than the amount already paid');
    }
    const before = this.snapshot(invoice);
    if (dto.amount !== undefined) invoice.amount = dto.amount;
    if (dto.dueDate !== undefined) invoice.dueDate = dto.dueDate;
    if (dto.description !== undefined) invoice.description = dto.description;
    invoice.status = resolveInvoiceStatus(invoice, toDateOnly(new Date()));
    const saved = await this.invoices.save(invoice);
    this.audit.publish(meta, AuditAction.UPDATE, 'Invoice', id, before, this.snapshot(saved));
    return this.findOne(id, meta);
  }

  async cancel(id: string, meta: RequestMeta): Promise<Invoice> {
    this.scope.assertStaff(meta);
    const invoice = await this.invoices.findOne({ where: { id } });
    if (!invoice) {
      throw new RpcNotFoundException('Invoice not found');
    }
    if (invoice.paidAmount > 0) {
      throw new RpcBadRequestException('Invoices with payments cannot be cancelled; refund the payments first');
    }
    const before = this.snapshot(invoice);
    invoice.status = InvoiceStatus.CANCELLED;
    const saved = await this.invoices.save(invoice);
    this.audit.publish(meta, AuditAction.UPDATE, 'Invoice', id, before, this.snapshot(saved));
    return this.findOne(id, meta);
  }

  async generate(dto: GenerateInvoicesDto, meta: RequestMeta | null): Promise<InvoiceGenerationResult> {
    if (meta) {
      this.scope.assertStaff(meta);
    }
    const period = startOfMonth(new Date(dto.periodMonth));
    const periodMonth = toDateOnly(period);
    const dueDate = toDateOnly(new Date(period.getFullYear(), period.getMonth(), dto.dueDay ?? 10));
    const qb = this.enrollments
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.group', 'group')
      .innerJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.status = :active', { active: EnrollmentStatus.ACTIVE })
      .andWhere('group.status = :groupActive', { groupActive: GroupStatus.ACTIVE })
      .andWhere('group.startDate <= :periodEnd', { periodEnd: toDateOnly(new Date(period.getFullYear(), period.getMonth() + 1, 0)) })
      .andWhere('(group.endDate IS NULL OR group.endDate >= :periodMonth)', { periodMonth })
      .andWhere('enrollment.joinedAt <= :periodEnd')
      .andWhere('(enrollment.leftAt IS NULL OR enrollment.leftAt >= :periodMonth)');
    if (dto.groupId) {
      qb.andWhere('group.id = :groupId', { groupId: dto.groupId });
    }
    const enrollments = await qb.getMany();
    const existing = enrollments.length
      ? await this.invoices.find({
          where: { enrollmentId: In(enrollments.map((enrollment) => enrollment.id)), periodMonth },
          select: { enrollmentId: true },
        })
      : [];
    const billed = new Set(existing.map((invoice) => invoice.enrollmentId));
    const created: Invoice[] = [];
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Invoice);
      for (const enrollment of enrollments) {
        if (billed.has(enrollment.id)) {
          continue;
        }
        const amount = computeInvoiceAmount(enrollment.group.monthlyFee, enrollment.discountPercent);
        if (amount <= 0) {
          continue;
        }
        const invoice = await repo.save(
          repo.create({
            number: await this.numbering.next(manager, 'invoices', 'INV', period),
            studentId: enrollment.studentId,
            groupId: enrollment.groupId,
            enrollmentId: enrollment.id,
            periodMonth,
            amount,
            paidAmount: 0,
            dueDate,
            status: resolveInvoiceStatus({ amount, paidAmount: 0, dueDate, status: InvoiceStatus.PENDING }, toDateOnly(new Date())),
            description: `${enrollment.group.name} fee for ${periodMonth.slice(0, 7)}`,
          }),
        );
        invoice.student = enrollment.student;
        created.push(invoice);
      }
    });
    for (const invoice of created) {
      this.emitCreated(invoice, invoice.student);
    }
    this.audit.publish(meta ?? undefined, AuditAction.GENERATE, 'Invoice', undefined, null, {
      periodMonth,
      groupId: dto.groupId ?? null,
      created: created.length,
    });
    this.logger.log(`Generated ${created.length} invoice(s) for ${periodMonth}`);
    return {
      periodMonth,
      created: created.length,
      skipped: enrollments.length - created.length,
      totalAmount: created.reduce((sum, invoice) => sum + invoice.amount, 0),
    };
  }

  async markOverdue(): Promise<number> {
    const today = toDateOnly(new Date());
    const candidates = await this.invoices.find({
      where: { status: In([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID]) },
      relations: { student: true },
    });
    const overdue = candidates.filter((invoice) => invoice.dueDate < today);
    if (overdue.length) {
      await this.invoices.update(
        { id: In(overdue.map((invoice) => invoice.id)) },
        { status: InvoiceStatus.OVERDUE },
      );
      for (const invoice of overdue) {
        this.rpc.emit(EVENTS.INVOICE_OVERDUE, {
          invoiceId: invoice.id,
          number: invoice.number,
          studentId: invoice.studentId,
          studentUserId: invoice.student?.userId ?? null,
          amount: invoice.amount,
          outstanding: invoice.amount - invoice.paidAmount,
          dueDate: invoice.dueDate,
        });
      }
    }
    return overdue.length;
  }

  private baseQuery(): SelectQueryBuilder<Invoice> {
    return this.invoices
      .createQueryBuilder('invoice')
      .innerJoinAndSelect('invoice.student', 'student')
      .leftJoinAndSelect('invoice.group', 'group');
  }

  private emitCreated(invoice: Invoice, student: Student | null | undefined): void {
    this.rpc.emit(EVENTS.INVOICE_CREATED, {
      invoiceId: invoice.id,
      number: invoice.number,
      studentId: invoice.studentId,
      studentUserId: student?.userId ?? null,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      periodMonth: invoice.periodMonth,
    });
  }

  private snapshot(invoice: Invoice): Record<string, unknown> {
    return {
      number: invoice.number,
      studentId: invoice.studentId,
      groupId: invoice.groupId,
      periodMonth: invoice.periodMonth,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      dueDate: invoice.dueDate,
      status: invoice.status,
    };
  }
}
