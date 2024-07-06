import { AuditPublisher } from '@app/common/audit';
import { detectConflicts, isValidTimeRange, ScheduleConflict, ScheduleSlotLike } from '@app/common/domain';
import { CheckConflictsDto, CreateScheduleDto, ScheduleQueryDto, UpdateScheduleDto } from '@app/common/dto';
import { AuditAction, GroupStatus, SortOrder } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcConflictException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, isStudentScoped, isTeacherScoped, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Group, Room, Schedule, Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: Array<ScheduleConflict & { groupName?: string; startTime?: string; endTime?: string }>;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly audit: AuditPublisher,
  ) {}

  async findAll(query: ScheduleQueryDto, meta: RequestMeta): Promise<Paginated<Schedule>> {
    const qb = this.baseQuery();
    if (query.groupId) qb.andWhere('schedule.groupId = :groupId', { groupId: query.groupId });
    if (query.teacherId) qb.andWhere('group.teacherId = :teacherId', { teacherId: query.teacherId });
    if (query.roomId) qb.andWhere('schedule.roomId = :roomId', { roomId: query.roomId });
    if (query.branchId) qb.andWhere('room.branchId = :branchId', { branchId: query.branchId });
    if (query.weekday) qb.andWhere('schedule.weekday = :weekday', { weekday: query.weekday });
    if (query.search) qb.andWhere('(group.name ILIKE :search OR course.name ILIKE :search)', { search: `%${query.search}%` });
    await this.applyScope(qb, meta);
    applySorting(qb, 'schedule', { ...query, sortOrder: query.sortBy ? query.sortOrder : SortOrder.ASC }, ['weekday', 'startTime', 'createdAt'], 'weekday');
    qb.addOrderBy('schedule.startTime', 'ASC');
    return paginateQuery(qb, query);
  }

  async findOne(id: string, meta: RequestMeta): Promise<Schedule> {
    const qb = this.baseQuery().where('schedule.id = :id', { id });
    await this.applyScope(qb, meta);
    const schedule = await qb.getOne();
    if (!schedule) {
      throw new RpcNotFoundException('Schedule not found');
    }
    return schedule;
  }

  async checkConflicts(dto: CheckConflictsDto): Promise<ConflictReport> {
    const group = await this.loadGroup(dto.groupId);
    const candidate = this.toSlot({ ...dto, effectiveFrom: dto.effectiveFrom ?? group.startDate, roomId: dto.roomId ?? group.roomId }, group, dto.id);
    return this.report(candidate);
  }

  async create(dto: CreateScheduleDto, meta: RequestMeta): Promise<Schedule> {
    const group = await this.loadGroup(dto.groupId);
    const roomId = dto.roomId ?? group.roomId ?? null;
    await this.assertRoom(roomId);
    const candidate = this.toSlot({ ...dto, effectiveFrom: dto.effectiveFrom ?? group.startDate, roomId: roomId ?? undefined }, group);
    this.assertTimeRange(candidate);
    await this.assertNoConflicts(candidate);
    const schedule = await this.schedules
      .save(
        this.schedules.create({
          groupId: dto.groupId,
          roomId,
          weekday: dto.weekday,
          startTime: dto.startTime,
          endTime: dto.endTime,
          effectiveFrom: candidate.effectiveFrom,
          effectiveTo: dto.effectiveTo ?? group.endDate ?? null,
        }),
      )
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Schedule', schedule.id, null, this.snapshot(schedule));
    return this.findOne(schedule.id, meta);
  }

  async update(id: string, dto: UpdateScheduleDto, meta: RequestMeta): Promise<Schedule> {
    const schedule = await this.schedules.findOne({ where: { id } });
    if (!schedule) {
      throw new RpcNotFoundException('Schedule not found');
    }
    const group = await this.loadGroup(dto.groupId ?? schedule.groupId);
    const before = this.snapshot(schedule);
    const merged: Schedule = Object.assign(schedule, {
      groupId: group.id,
      roomId: dto.roomId === undefined ? schedule.roomId : dto.roomId,
      weekday: dto.weekday ?? schedule.weekday,
      startTime: dto.startTime ?? this.trimTime(schedule.startTime),
      endTime: dto.endTime ?? this.trimTime(schedule.endTime),
      effectiveFrom: dto.effectiveFrom ?? schedule.effectiveFrom,
      effectiveTo: dto.effectiveTo === undefined ? schedule.effectiveTo : dto.effectiveTo,
    });
    await this.assertRoom(merged.roomId);
    const candidate = this.toSlot(merged, group, id);
    this.assertTimeRange(candidate);
    await this.assertNoConflicts(candidate);
    const saved = await this.schedules.save(merged).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Schedule', id, before, this.snapshot(saved));
    return this.findOne(id, meta);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const schedule = await this.schedules.findOne({ where: { id } });
    if (!schedule) {
      throw new RpcNotFoundException('Schedule not found');
    }
    await this.schedules.remove(schedule);
    this.audit.publish(meta, AuditAction.DELETE, 'Schedule', id, this.snapshot(schedule), null);
    return { deleted: true };
  }

  private baseQuery(): SelectQueryBuilder<Schedule> {
    return this.schedules
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.teacher', 'teacher')
      .leftJoinAndSelect('schedule.room', 'room');
  }

  private async applyScope(qb: SelectQueryBuilder<Schedule>, meta: RequestMeta): Promise<void> {
    if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      qb.andWhere('group.teacherId = :scopedTeacherId', { scopedTeacherId: teacher?.id ?? NIL_UUID });
    } else if (isStudentScoped(meta)) {
      const student = await this.students.findOne({ where: { userId: meta.userId } });
      qb.andWhere(
        'EXISTS (SELECT 1 FROM group_students gs WHERE gs."groupId" = group.id AND gs."studentId" = :scopedStudentId AND gs.status = \'ACTIVE\')',
        { scopedStudentId: student?.id ?? NIL_UUID },
      );
    }
  }

  private async loadGroup(groupId: string): Promise<Group> {
    const group = await this.groups.findOne({ where: { id: groupId } });
    if (!group) {
      throw new RpcBadRequestException('Group does not exist');
    }
    if (group.status === GroupStatus.CANCELLED || group.status === GroupStatus.COMPLETED) {
      throw new RpcBadRequestException('Cannot schedule a completed or cancelled group');
    }
    return group;
  }

  private async assertRoom(roomId: string | null): Promise<void> {
    if (roomId && !(await this.rooms.exist({ where: { id: roomId, isActive: true } }))) {
      throw new RpcBadRequestException('Room does not exist or is inactive');
    }
  }

  private assertTimeRange(slot: ScheduleSlotLike): void {
    if (!isValidTimeRange(slot.startTime, slot.endTime)) {
      throw new RpcBadRequestException('End time must be after start time');
    }
    if (slot.effectiveTo && slot.effectiveTo < slot.effectiveFrom) {
      throw new RpcBadRequestException('Effective end date must be after the start date');
    }
  }

  private async assertNoConflicts(candidate: ScheduleSlotLike): Promise<void> {
    const report = await this.report(candidate);
    if (report.hasConflicts) {
      const described = report.conflicts.map(
        (conflict) => `${conflict.kind} conflict with ${conflict.groupName ?? conflict.groupId} (${conflict.startTime}-${conflict.endTime})`,
      );
      throw new RpcConflictException(described.join('; '));
    }
  }

  private async report(candidate: ScheduleSlotLike): Promise<ConflictReport> {
    const existing = await this.schedules
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.group', 'group')
      .where('schedule.weekday = :weekday', { weekday: candidate.weekday })
      .andWhere('group.status IN (:...statuses)', { statuses: [GroupStatus.ACTIVE, GroupStatus.PAUSED] })
      .getMany();
    const slots = existing.map((schedule) => this.toSlot(schedule, schedule.group, schedule.id));
    const conflicts = detectConflicts(candidate, slots);
    const byId = new Map(existing.map((schedule) => [schedule.id, schedule]));
    return {
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map((conflict) => {
        const schedule = conflict.scheduleId ? byId.get(conflict.scheduleId) : undefined;
        return {
          ...conflict,
          groupName: schedule?.group.name,
          startTime: schedule ? this.trimTime(schedule.startTime) : undefined,
          endTime: schedule ? this.trimTime(schedule.endTime) : undefined,
        };
      }),
    };
  }

  private toSlot(
    source: { groupId: string; roomId?: string | null; weekday: number; startTime: string; endTime: string; effectiveFrom: string; effectiveTo?: string | null },
    group: Group,
    id?: string,
  ): ScheduleSlotLike {
    return {
      id,
      groupId: source.groupId,
      roomId: source.roomId ?? null,
      teacherId: group.teacherId,
      weekday: source.weekday,
      startTime: this.trimTime(source.startTime),
      endTime: this.trimTime(source.endTime),
      effectiveFrom: source.effectiveFrom,
      effectiveTo: source.effectiveTo ?? null,
    };
  }

  private trimTime(time: string): string {
    return time.slice(0, 5);
  }

  private snapshot(schedule: Schedule): Record<string, unknown> {
    return {
      groupId: schedule.groupId,
      roomId: schedule.roomId,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      effectiveFrom: schedule.effectiveFrom,
      effectiveTo: schedule.effectiveTo,
    };
  }
}
