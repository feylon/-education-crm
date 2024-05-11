import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Student } from './student.entity';

@Entity('parents')
export class Parent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, (student) => student.parents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ length: 150 })
  fullName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 50, default: 'PARENT' })
  relation: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ type: 'bigint', nullable: true })
  telegramChatId: string | null;
}
