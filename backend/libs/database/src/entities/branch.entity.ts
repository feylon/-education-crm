import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Room } from './room.entity';

@Entity('branches')
export class Branch extends SoftDeletableEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Room, (room) => room.branch)
  rooms: Room[];
}
