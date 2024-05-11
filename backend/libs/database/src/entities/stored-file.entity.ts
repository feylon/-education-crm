import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('files')
export class StoredFile extends BaseEntity {
  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Index({ unique: true })
  @Column({ length: 500 })
  path: string;

  @Column({ length: 100, default: 'general' })
  category: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;
}
