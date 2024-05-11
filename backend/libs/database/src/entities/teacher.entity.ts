import { SalaryType, TeacherStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Branch } from './branch.entity';
import { Group } from './group.entity';
import { User } from './user.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('teachers')
@Index(['lastName', 'firstName'])
export class Teacher extends SoftDeletableEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  specialization: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'date', nullable: true })
  hireDate: string | null;

  @Column({ type: 'enum', enum: SalaryType, default: SalaryType.FIXED })
  salaryType: SalaryType;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: decimalTransformer })
  salaryAmount: number;

  @Index()
  @Column({ type: 'enum', enum: TeacherStatus, default: TeacherStatus.ACTIVE })
  status: TeacherStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch | null;

  @OneToMany(() => Group, (group) => group.teacher)
  groups: Group[];

  get fullName(): string {
    return `${this.lastName} ${this.firstName}`.trim();
  }
}
