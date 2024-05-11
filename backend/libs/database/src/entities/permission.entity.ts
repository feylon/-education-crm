import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 100 })
  code: string;

  @Index()
  @Column({ length: 50 })
  module: string;

  @Column({ length: 255 })
  description: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
