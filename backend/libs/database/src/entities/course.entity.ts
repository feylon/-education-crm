import { CourseStatus } from '@app/common/enums';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { CourseCategory } from './course-category.entity';
import { Group } from './group.entity';
import { decimalTransformer } from '../transformers/decimal.transformer';

@Entity('courses')
export class Course extends SoftDeletableEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => CourseCategory, (category) => category.courses, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: CourseCategory | null;

  @Column({ type: 'int', default: 3 })
  durationMonths: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  price: number;

  @Index()
  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.ACTIVE })
  status: CourseStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @OneToMany(() => Group, (group) => group.course)
  groups: Group[];
}
