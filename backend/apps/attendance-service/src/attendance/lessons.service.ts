import { AuditPublisher } from '@app/common/audit';
import { CreateLessonDto, GenerateLessonsDto, LessonQueryDto, UpdateLessonDto } from '@app/common/dto';
import { AuditAction, GroupStatus, LessonStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { isValidTimeRange } from '@app/common/domain';
import { addDays, applySorting, isoWeekday, paginateQuery, toDateOnly, translateDatabaseError } from '@app/common/utils';
import { Group, Lesson, Room, Schedule } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { ScopeService } from './scope.service';

export interface GenerationResult {
  created: number;
  skipped: number;
  from: string;
  to: string;
  groups: number;
}

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    private readonly scope: ScopeService,
    private readonly audit: AuditPublisher,
  ) {}

  async findAll(query: LessonQueryDto, meta: RequestMeta): Promise<Paginated<Lesson>> {
    const qb = this.baseQuery();
    if (query.groupId) qb.andWhere('lesson.groupId = :groupId', { groupId: query.groupId });
    if (query.teacherId) qb.andWhere('lesson.teacherId = :teacherId', { teacherId: query.teacherId });
    if (query.status) qb.andWhere('lesson.status = :status', { status: query.status });
    if (query.from) qb.andWhere('lesson.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('lesson.date <= :to', { to: query.to });
    if (query.search) qb.andWhere('(group.name ILIKE :search OR lesson.topic ILIKE :search)', { search: `%${query.search}%` });
    await this.scope.applyGroupScope(qb, 'group', meta);
    applySorting(qb, 'lesson', query, ['date', 'startTime', 'status', 'createdAt'], 'date');
    qb.addOrderBy('lesson.startTime', 'DESC');
    return paginateQuery(qb, query);
  }

  async findOne(id: string, meta: RequestMeta): Promise<Lesson> {
    const qb = this.baseQuery().where('lesson.id = :id', { id });
    await this.scope.applyGroupScope(qb, 'group', meta);
    const lesson = await qb.getOne();
    if (!lesson) {
      throw new RpcNotFoundException('Lesson not found');
    }
    return lesson;
  }

  async create(dto: CreateLessonDto, meta: RequestMeta): Promise<Lesson> {
    const group = await this.scope.assertGroupAccess(dto.groupId, meta);
    if (!isValidTimeRange(dto.startTime, dto.endTime)) {
      throw new RpcBadRequestException('End time must be after start time');
    }
    const roomId = dto.roomId ?? group.roomId;
    if (roomId && !(await this.rooms.exist({ where: { id: roomId } }))) {
      throw new RpcBadRequestException('Room does not exist');
    }
    const lesson = await this.lessons
      .save(
        this.lessons.create({
          groupId: group.id,
          scheduleId: null,
          teacherId: group.teacherId,
          roomId,
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          topic: dto.topic ?? null,
          status: LessonStatus.PLANNED,
        }),
      )
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Lesson', lesson.id, null, this.snapshot(lesson));
    return this.findOne(lesson.id, meta);
  }

  async update(id: string, dto: UpdateLessonDto, meta: RequestMeta): Promise<Lesson> {
    const lesson = await this.findOne(id, meta);
    await this.scope.assertGroupAccess(lesson.groupId, meta);
    const before = this.snapshot(lesson);
    const startTime = dto.startTime ?? lesson.startTime.slice(0, 5);
    const endTime = dto.endTime ?? lesson.endTime.slice(0, 5);
    if (!isValidTimeRange(startTime, endTime)) {
      throw new RpcBadRequestException('End time must be after start time');
    }
    if (dto.roomId && !(await this.rooms.exist({ where: { id: dto.roomId } }))) {
      throw new RpcBadRequestException('Room does not exist');
    }
    Object.assign(lesson, {
      date: dto.date ?? lesson.date,
      startTime,
      endTime,
      roomId: dto.roomId === undefined ? lesson.roomId : dto.roomId,
      topic: dto.topic === undefined ? lesson.topic : dto.topic,
      status: dto.status ?? lesson.status,
    });
    const saved = await this.lessons.save(lesson).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Lesson', id, before, this.snapshot(saved));
    return this.findOne(id, meta);
  }

  async generate(dto: GenerateLessonsDto, meta: RequestMeta): Promise<GenerationResult> {
    if (dto.to < dto.from) {
      throw new RpcBadRequestException('Range end must be after start');
    }
    if ((new Date(dto.to).getTime() - new Date(dto.from).getTime()) / 86400000 > 93) {
      throw new RpcBadRequestException('Range cannot exceed 93 days');
    }
    const groupsQb = this.groups.createQueryBuilder('group').where('group.status = :active', { active: GroupStatus.ACTIVE });
    if (dto.groupId) {
      await this.scope.assertGroupAccess(dto.groupId, meta);
      groupsQb.andWhere('group.id = :groupId', { groupId: dto.groupId });
    } else {
      await this.scope.applyGroupScope(groupsQb, 'group', meta);
    }
    const groups = await groupsQb.getMany();
    if (groups.length === 0) {
      return { created: 0, skipped: 0, from: dto.from, to: dto.to, groups: 0 };
    }
    const groupIds = groups.map((group) => group.id);
    const [slots, existing] = await Promise.all([
      this.schedules.find({ where: { groupId: In(groupIds) } }),
      this.lessons
        .createQueryBuilder('lesson')
        .select(['lesson.groupId', 'lesson.date', 'lesson.startTime'])
        .where('lesson.groupId IN (:...groupIds)', { groupIds })
        .andWhere('lesson.date BETWEEN :from AND :to', { from: dto.from, to: dto.to })
        .getMany(),
    ]);
    const taken = new Set(existing.map((lesson) => `${lesson.groupId}|${lesson.date}|${lesson.startTime.slice(0, 5)}`));
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const toCreate: Lesson[] = [];
    let skipped = 0;
    for (let cursor = new Date(dto.from); toDateOnly(cursor) <= dto.to; cursor = addDays(cursor, 1)) {
      const date = toDateOnly(cursor);
      const weekday = isoWeekday(cursor);
      for (const slot of slots) {
        if (slot.weekday !== weekday || slot.effectiveFrom > date || (slot.effectiveTo && slot.effectiveTo < date)) {
          continue;
        }
        const group = groupById.get(slot.groupId);
        if (!group || group.startDate > date || (group.endDate && group.endDate < date)) {
          continue;
        }
        const key = `${slot.groupId}|${date}|${slot.startTime.slice(0, 5)}`;
        if (taken.has(key)) {
          skipped += 1;
          continue;
        }
        taken.add(key);
        toCreate.push(
          this.lessons.create({
            groupId: slot.groupId,
            scheduleId: slot.id,
            teacherId: group.teacherId,
            roomId: slot.roomId ?? group.roomId,
            date,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            status: LessonStatus.PLANNED,
            topic: null,
          }),
        );
      }
    }
    if (toCreate.length) {
      await this.lessons.save(toCreate, { chunk: 200 }).catch(translateDatabaseError);
    }
    this.audit.publish(meta, AuditAction.GENERATE, 'Lesson', undefined, null, {
      from: dto.from,
      to: dto.to,
      groupId: dto.groupId ?? null,
      created: toCreate.length,
    });
    return { created: toCreate.length, skipped, from: dto.from, to: dto.to, groups: groups.length };
  }

  private baseQuery(): SelectQueryBuilder<Lesson> {
    return this.lessons
      .createQueryBuilder('lesson')
      .innerJoinAndSelect('lesson.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('lesson.teacher', 'teacher')
      .leftJoinAndSelect('lesson.room', 'room')
      .loadRelationCountAndMap('lesson.markedCount', 'lesson.attendanceRecords');
  }

  private snapshot(lesson: Lesson): Record<string, unknown> {
    return {
      groupId: lesson.groupId,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      roomId: lesson.roomId,
      topic: lesson.topic,
      status: lesson.status,
    };
  }
}
