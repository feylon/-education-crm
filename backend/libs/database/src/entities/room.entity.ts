import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Branch } from './branch.entity';

@Entity('rooms')
@Index(['branchId', 'name'], { unique: true, where: '"deletedAt" IS NULL' })
export class Room extends SoftDeletableEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @ManyToOne(() => Branch, (branch) => branch.rooms, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 12 })
  capacity: number;

  @Column({ default: true })
  isActive: boolean;
}
