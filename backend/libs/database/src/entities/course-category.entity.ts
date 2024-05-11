import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Course } from './course.entity';

@Entity('course_categories')
export class CourseCategory extends SoftDeletableEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @OneToMany(() => Course, (course) => course.category)
  courses: Course[];
}
