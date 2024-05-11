import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('payment_allocations')
@Index(['paymentId', 'invoiceId'], { unique: true })
export class PaymentAllocation extends BaseEntity {
  @Column({ type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Index()
  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;
}
