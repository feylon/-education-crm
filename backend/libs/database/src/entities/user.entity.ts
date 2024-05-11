import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User extends SoftDeletableEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, select: false })
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'bigint', nullable: true })
  telegramChatId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
