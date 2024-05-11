import { InvoiceStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Group } from './group.entity';
import { GroupStudent } from './group-student.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Student } from './student.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('invoices')
@Index(['enrollmentId', 'periodMonth'], { unique: true, where: '"enrollmentId" IS NOT NULL' })
export class Invoice extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 30 })
  number: string;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne(() => Group, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group | null;

  @Column({ type: 'uuid', nullable: true })
  enrollmentId: string | null;

  @ManyToOne(() => GroupStudent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: GroupStudent | null;

  @Index()
  @Column({ type: 'date' })
  periodMonth: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  paidAmount: number;

  @Index()
  @Column({ type: 'date' })
  dueDate: string;

  @Index()
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => PaymentAllocation, (allocation) => allocation.invoice)
  allocations: PaymentAllocation[];
}
