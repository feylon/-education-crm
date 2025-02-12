import { resolveInvoiceStatus, roundMoney } from '@app/common/domain';
import { PaymentStatus } from '@app/common/enums';
import { toDateOnly } from '@app/common/utils';
import { Invoice, Payment, PaymentAllocation } from '@app/database';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class CreditService {
  async unallocatedPayments(manager: EntityManager, studentId: string): Promise<Array<{ paymentId: string; remaining: number }>> {
    const rows = await manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .leftJoin('payment.allocations', 'allocation')
      .select('payment.id', 'paymentId')
      .addSelect('payment.amount - COALESCE(SUM(allocation.amount), 0)', 'remaining')
      .where('payment.studentId = :studentId AND payment.status = :completed', { studentId, completed: PaymentStatus.COMPLETED })
      .groupBy('payment.id')
      .addGroupBy('payment.paidAt')
      .having('payment.amount - COALESCE(SUM(allocation.amount), 0) > 0')
      .orderBy('payment.paidAt', 'ASC')
      .getRawMany<{ paymentId: string; remaining: string }>();
    return rows.map((row) => ({ paymentId: row.paymentId, remaining: roundMoney(Number(row.remaining)) }));
  }

  async applyToInvoice(manager: EntityManager, invoice: Invoice): Promise<Invoice> {
    const credits = await this.unallocatedPayments(manager, invoice.studentId);
    let outstanding = roundMoney(invoice.amount - invoice.paidAmount);
    for (const credit of credits) {
      if (outstanding <= 0) {
        break;
      }
      const portion = roundMoney(Math.min(credit.remaining, outstanding));
      await manager.getRepository(PaymentAllocation).save(
        manager.getRepository(PaymentAllocation).create({ paymentId: credit.paymentId, invoiceId: invoice.id, amount: portion }),
      );
      invoice.paidAmount = roundMoney(invoice.paidAmount + portion);
      outstanding = roundMoney(outstanding - portion);
    }
    invoice.status = resolveInvoiceStatus(invoice, toDateOnly(new Date()));
    return manager.getRepository(Invoice).save(invoice);
  }
}
