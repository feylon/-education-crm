import { PaymentMethod, PaymentStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Group } from './group.entity';
import { Invoice } from './invoice.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Student } from './student.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('payments')
export class Payment extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 30 })
  number: string;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Index()
  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Index()
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  @Index()
  @Column({ type: 'timestamptz' })
  paidAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  receivedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  refundReason: string | null;

  @OneToMany(() => PaymentAllocation, (allocation) => allocation.payment, { cascade: true })
  allocations: PaymentAllocation[];
}
