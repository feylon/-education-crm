import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Group } from './group.entity';
import { Room } from './room.entity';

@Entity('schedules')
@Index(['weekday', 'startTime', 'endTime'])
export class Schedule extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, (group) => group.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  roomId: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room | null;

  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;
}
