import { PAYMENT_PATTERNS } from '@app/common/constants';
import {
  CreateInvoiceDto,
  CreatePaymentDto,
  DebtorsQueryDto,
  GenerateInvoicesDto,
  InvoiceQueryDto,
  PaymentQueryDto,
  RefundPaymentDto,
  UpdateInvoiceDto,
} from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DebtService } from './debt.service';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly invoices: InvoicesService,
    private readonly debt: DebtService,
  ) {}

  @MessagePattern(PAYMENT_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<PaymentQueryDto>) {
    return this.payments.findAll(payload.data, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.payments.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreatePaymentDto>) {
    return this.payments.create(payload.data, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.REFUND)
  refund(@Payload() payload: WithMeta<{ id: string; dto: RefundPaymentDto }>) {
    return this.payments.refund(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.CANCEL)
  cancel(@Payload() payload: WithMeta<{ id: string; dto: RefundPaymentDto }>) {
    return this.payments.cancel(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.STUDENT_SUMMARY)
  studentSummary(@Payload() payload: WithMeta<{ studentId: string }>) {
    return this.debt.studentSummary(payload.data.studentId, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.STUDENT_HISTORY)
  studentHistory(@Payload() payload: WithMeta<{ studentId: string; query: PaymentQueryDto }>) {
    return this.payments.findAll({ ...payload.data.query, studentId: payload.data.studentId }, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.DEBTORS)
  debtors(@Payload() payload: WithMeta<DebtorsQueryDto>) {
    return this.debt.debtors(payload.data, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.GROUP_SUMMARY)
  groupSummary(@Payload() payload: WithMeta<{ groupId: string }>) {
    return this.debt.groupSummary(payload.data.groupId);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_FIND_ALL)
  invoicesList(@Payload() payload: WithMeta<InvoiceQueryDto>) {
    return this.invoices.findAll(payload.data, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_FIND_ONE)
  invoice(@Payload() payload: WithMeta<{ id: string }>) {
    return this.invoices.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_CREATE)
  createInvoice(@Payload() payload: WithMeta<CreateInvoiceDto>) {
    return this.invoices.create(payload.data, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_UPDATE)
  updateInvoice(@Payload() payload: WithMeta<{ id: string; dto: UpdateInvoiceDto }>) {
    return this.invoices.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_CANCEL)
  cancelInvoice(@Payload() payload: WithMeta<{ id: string }>) {
    return this.invoices.cancel(payload.data.id, payload.meta);
  }

  @MessagePattern(PAYMENT_PATTERNS.INVOICES_GENERATE)
  generateInvoices(@Payload() payload: WithMeta<GenerateInvoicesDto>) {
    return this.invoices.generate(payload.data, payload.meta);
  }
}
