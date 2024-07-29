import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { allocatePayment, isOpenInvoice, resolveInvoiceStatus, roundMoney } from '@app/common/domain';
import { CreatePaymentDto, PaymentQueryDto, RefundPaymentDto } from '@app/common/dto';
import { AuditAction, InvoiceStatus, PaymentStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, paginateQuery, toDateOnly, translateDatabaseError } from '@app/common/utils';
import { Group, Invoice, Payment, PaymentAllocation, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { NumberingService } from './numbering.service';
import { ScopeService } from './scope.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly dataSource: DataSource,
    private readonly numbering: NumberingService,
    private readonly scope: ScopeService,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async findAll(query: PaymentQueryDto, meta: RequestMeta): Promise<Paginated<Payment>> {
    const qb = this.baseQuery();
    if (query.studentId) qb.andWhere('payment.studentId = :studentId', { studentId: query.studentId });
    if (query.groupId) qb.andWhere('payment.groupId = :groupId', { groupId: query.groupId });
    if (query.method) qb.andWhere('payment.method = :method', { method: query.method });
    if (query.status) qb.andWhere('payment.status = :status', { status: query.status });
    if (query.from) qb.andWhere('payment.paidAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('payment.paidAt < :to', { to: toDateOnly(new Date(new Date(query.to).getTime() + 86400000)) });
    if (query.search) {
      qb.andWhere('(payment.number ILIKE :search OR student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    await this.scope.applyStudentScope(qb, 'payment', meta);
    applySorting(qb, 'payment', query, ['paidAt', 'amount', 'createdAt', 'method', 'status', 'number'], 'paidAt');
    return paginateQuery(qb, query);
  }

  async findOne(id: string, meta: RequestMeta): Promise<Payment> {
    const qb = this.baseQuery()
      .leftJoinAndSelect('payment.allocations', 'allocation')
      .leftJoinAndSelect('allocation.invoice', 'allocatedInvoice')
      .where('payment.id = :id', { id });
    await this.scope.applyStudentScope(qb, 'payment', meta);
    const payment = await qb.getOne();
    if (!payment) {
      throw new RpcNotFoundException('Payment not found');
    }
    return payment;
  }

  async create(dto: CreatePaymentDto, meta: RequestMeta): Promise<Payment> {
    this.scope.assertStaff(meta);
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new RpcBadRequestException('Student does not exist');
    }
    if (dto.groupId && !(await this.groups.exist({ where: { id: dto.groupId } }))) {
      throw new RpcBadRequestException('Group does not exist');
    }
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const today = toDateOnly(new Date());
    const payment = await this.dataSource
      .transaction(async (manager) => {
        const invoices = await this.openInvoices(manager, dto);
        const allocations = allocatePayment(invoices, dto.amount);
        const saved = await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            number: await this.numbering.next(manager, 'payments', 'PAY', paidAt),
            studentId: dto.studentId,
            invoiceId: dto.invoiceId ?? allocations[0]?.invoiceId ?? null,
            groupId: dto.groupId ?? (invoices.find((invoice) => invoice.id === allocations[0]?.invoiceId)?.groupId ?? null),
            amount: roundMoney(dto.amount),
            method: dto.method,
            status: PaymentStatus.COMPLETED,
            paidAt,
            description: dto.description ?? null,
            receivedById: meta.userId,
          }),
        );
        for (const allocation of allocations) {
          await manager.getRepository(PaymentAllocation).save(
            manager.getRepository(PaymentAllocation).create({ paymentId: saved.id, invoiceId: allocation.invoiceId, amount: allocation.amount }),
          );
          const invoice = invoices.find((item) => item.id === allocation.invoiceId);
          if (invoice) {
            invoice.paidAmount = roundMoney(invoice.paidAmount + allocation.amount);
            invoice.status = resolveInvoiceStatus(invoice, today);
            await manager.getRepository(Invoice).save(invoice);
          }
        }
        return saved;
      })
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.PAYMENT, 'Payment', payment.id, null, this.snapshot(payment));
    this.rpc.emit(EVENTS.PAYMENT_CREATED, {
      paymentId: payment.id,
      number: payment.number,
      studentId: student.id,
      studentUserId: student.userId,
      studentName: `${student.lastName} ${student.firstName}`,
      amount: payment.amount,
      method: payment.method,
      receivedBy: meta.userId,
    });
    return this.findOne(payment.id, meta);
  }

  async refund(id: string, dto: RefundPaymentDto, meta: RequestMeta): Promise<Payment> {
    this.scope.assertStaff(meta);
    const payment = await this.payments.findOne({ where: { id }, relations: { allocations: true, student: true } });
    if (!payment) {
      throw new RpcNotFoundException('Payment not found');
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new RpcBadRequestException('Only completed payments can be refunded');
    }
    const before = this.snapshot(payment);
    await this.dataSource.transaction(async (manager) => {
      await this.rollbackAllocations(manager, payment);
      await manager.getRepository(Payment).update(id, {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: dto.reason,
      });
    });
    this.audit.publish(meta, AuditAction.REFUND, 'Payment', id, before, { ...before, status: PaymentStatus.REFUNDED, reason: dto.reason });
    this.rpc.emit(EVENTS.PAYMENT_REFUNDED, {
      paymentId: id,
      studentId: payment.studentId,
      studentUserId: payment.student?.userId ?? null,
      amount: payment.amount,
      reason: dto.reason,
      actorId: meta.userId,
    });
    return this.findOne(id, meta);
  }

  async cancel(id: string, dto: RefundPaymentDto, meta: RequestMeta): Promise<Payment> {
    this.scope.assertStaff(meta);
    const payment = await this.payments.findOne({ where: { id }, relations: { allocations: true } });
    if (!payment) {
      throw new RpcNotFoundException('Payment not found');
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new RpcBadRequestException('Only completed payments can be cancelled');
    }
    const before = this.snapshot(payment);
    await this.dataSource.transaction(async (manager) => {
      await this.rollbackAllocations(manager, payment);
      await manager.getRepository(Payment).update(id, { status: PaymentStatus.CANCELLED, refundReason: dto.reason });
    });
    this.audit.publish(meta, AuditAction.UPDATE, 'Payment', id, before, { ...before, status: PaymentStatus.CANCELLED, reason: dto.reason });
    return this.findOne(id, meta);
  }

  private async openInvoices(manager: EntityManager, dto: CreatePaymentDto): Promise<Invoice[]> {
    const repo = manager.getRepository(Invoice);
    if (dto.invoiceId) {
      const invoice = await repo.findOne({ where: { id: dto.invoiceId }, lock: { mode: 'pessimistic_write' } });
      if (!invoice || invoice.studentId !== dto.studentId) {
        throw new RpcBadRequestException('Invoice does not belong to this student');
      }
      if (!isOpenInvoice(invoice)) {
        throw new RpcBadRequestException('Invoice is already paid or cancelled');
      }
      return [invoice];
    }
    const qb = repo
      .createQueryBuilder('invoice')
      .setLock('pessimistic_write')
      .where('invoice.studentId = :studentId', { studentId: dto.studentId })
      .andWhere('invoice.status IN (:...open)', { open: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] });
    if (dto.groupId) {
      qb.andWhere('invoice.groupId = :groupId', { groupId: dto.groupId });
    }
    return qb.getMany();
  }

  private async rollbackAllocations(manager: EntityManager, payment: Payment): Promise<void> {
    const today = toDateOnly(new Date());
    for (const allocation of payment.allocations ?? []) {
      const invoice = await manager.getRepository(Invoice).findOne({ where: { id: allocation.invoiceId } });
      if (!invoice) {
        continue;
      }
      invoice.paidAmount = roundMoney(Math.max(0, invoice.paidAmount - allocation.amount));
      invoice.status = invoice.status === InvoiceStatus.CANCELLED ? invoice.status : resolveInvoiceStatus({ ...invoice, status: InvoiceStatus.PENDING }, today);
      await manager.getRepository(Invoice).save(invoice);
    }
    await manager.getRepository(PaymentAllocation).delete({ paymentId: payment.id });
  }

  private baseQuery(): SelectQueryBuilder<Payment> {
    return this.payments
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('payment.group', 'group')
      .leftJoinAndSelect('payment.invoice', 'invoice');
  }

  private snapshot(payment: Payment): Record<string, unknown> {
    return {
      number: payment.number,
      studentId: payment.studentId,
      invoiceId: payment.invoiceId,
      groupId: payment.groupId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt,
    };
  }
}
