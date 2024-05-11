import { EnrollmentStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Group } from './group.entity';
import { Student } from './student.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('group_students')
@Index(['groupId', 'studentId'], { unique: true })
export class GroupStudent extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, (group) => group.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, (student) => student.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'date' })
  joinedAt: string;

  @Column({ type: 'date', nullable: true })
  leftAt: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: decimalTransformer })
  discountPercent: number;

  @Index()
  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
