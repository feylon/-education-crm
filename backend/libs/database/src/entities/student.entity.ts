import { Gender, StudentStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Branch } from './branch.entity';
import { GroupStudent } from './group-student.entity';
import { Parent } from './parent.entity';
import { User } from './user.entity';

@Entity('students')
@Index(['lastName', 'firstName'])
export class Student extends SoftDeletableEntity {
  @Index({ unique: true, where: '"userId" IS NOT NULL' })
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @OneToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  passportSeries: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  passportNumber: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone: string | null;

  @Index()
  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'bigint', nullable: true })
  telegramChatId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch | null;

  @OneToMany(() => Parent, (parent) => parent.student, { cascade: true })
  parents: Parent[];

  @OneToMany(() => GroupStudent, (enrollment) => enrollment.student)
  enrollments: GroupStudent[];

  get fullName(): string {
    return `${this.lastName} ${this.firstName}`.trim();
  }
}
