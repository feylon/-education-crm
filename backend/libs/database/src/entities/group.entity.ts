import { GroupStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Branch } from './branch.entity';
import { Course } from './course.entity';
import { GroupStudent } from './group-student.entity';
import { Room } from './room.entity';
import { Schedule } from './schedule.entity';
import { Teacher } from './teacher.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('groups')
export class Group extends SoftDeletableEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 100 })
  name: string;

  @Index()
  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.groups, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  teacherId: string | null;

  @ManyToOne(() => Teacher, (teacher) => teacher.groups, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  roomId: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  monthlyFee: number;

  @Column({ type: 'int', default: 12 })
  capacity: number;

  @Index()
  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  status: GroupStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => GroupStudent, (enrollment) => enrollment.group)
  enrollments: GroupStudent[];

  @OneToMany(() => Schedule, (schedule) => schedule.group)
  schedules: Schedule[];
}
