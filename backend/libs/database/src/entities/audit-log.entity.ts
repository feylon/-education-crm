import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('audit_logs')
@Index(['entity', 'entityId'])
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userEmail: string | null;

  @Index()
  @Column({ length: 50 })
  action: string;

  @Column({ length: 100 })
  entity: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;
}
