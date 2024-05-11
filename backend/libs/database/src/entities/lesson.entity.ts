import { LessonStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { BaseEntity } from './base.entity';
import { Group } from './group.entity';
import { Room } from './room.entity';
import { Schedule } from './schedule.entity';
import { Teacher } from './teacher.entity';

@Entity('lessons')
@Index(['groupId', 'date', 'startTime'], { unique: true })
export class Lesson extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'uuid', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => Schedule, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  teacherId: string | null;

  @ManyToOne(() => Teacher, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher | null;

  @Column({ type: 'uuid', nullable: true })
  roomId: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room | null;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string | null;

  @Index()
  @Column({ type: 'enum', enum: LessonStatus, default: LessonStatus.PLANNED })
  status: LessonStatus;

  @OneToMany(() => AttendanceRecord, (record) => record.lesson)
  attendanceRecords: AttendanceRecord[];
}
