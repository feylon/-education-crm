import { AttendanceStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Lesson } from './lesson.entity';
import { Student } from './student.entity';

@Entity('attendance_records')
@Index(['lessonId', 'studentId'], { unique: true })
export class AttendanceRecord extends BaseEntity {
  @Column({ type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.attendanceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Index()
  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  markedById: string | null;
}
