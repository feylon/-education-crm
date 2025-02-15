import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { CreateGroupDto, GroupQueryDto, LookupQueryDto, UpdateGroupDto } from '@app/common/dto';
import { AuditAction, EnrollmentStatus, GroupStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcForbiddenException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, isStudentScoped, isTeacherScoped, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Course, Group, GroupStudent, Lesson, Room, Schedule, Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository, SelectQueryBuilder } from 'typeorm';
import { detectConflicts, ScheduleSlotLike } from '@app/common/domain';
import { LessonStatus } from '@app/common/enums';
import { toDateOnly } from '@app/common/utils';

const SORTABLE = ['createdAt', 'name', 'startDate', 'endDate', 'status', 'monthlyFee'];
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async findAll(query: GroupQueryDto, meta: RequestMeta): Promise<Paginated<Group>> {
    const qb = this.baseQuery();
    if (query.search) {
      qb.andWhere('(group.name ILIKE :search OR course.name ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('group.status = :status', { status: query.status });
    if (query.courseId) qb.andWhere('group.courseId = :courseId', { courseId: query.courseId });
    if (query.teacherId) qb.andWhere('group.teacherId = :teacherId', { teacherId: query.teacherId });
    if (query.branchId) qb.andWhere('group.branchId = :branchId', { branchId: query.branchId });
    await this.applyScope(qb, meta);
    applySorting(qb, 'group', query, SORTABLE);
    return paginateQuery(qb, query);
  }

  async lookup(query: LookupQueryDto, meta: RequestMeta): Promise<Group[]> {
    const qb = this.groups
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.course', 'course')
      .where('group.status IN (:...statuses)', { statuses: [GroupStatus.ACTIVE, GroupStatus.PAUSED] })
      .orderBy('group.name', 'ASC')
      .take(30);
    if (query.search) {
      qb.andWhere('group.name ILIKE :search', { search: `%${query.search}%` });
    }
    await this.applyScope(qb, meta);
    return qb.getMany();
  }

  async findOne(id: string, meta: RequestMeta): Promise<Group> {
    const qb = this.baseQuery()
      .leftJoinAndSelect('group.schedules', 'schedule')
      .leftJoinAndSelect('schedule.room', 'scheduleRoom')
      .where('group.id = :id', { id });
    await this.applyScope(qb, meta);
    const group = await qb.getOne();
    if (!group) {
      throw new RpcNotFoundException('Group not found');
    }
    return group;
  }

  async create(dto: CreateGroupDto, meta: RequestMeta): Promise<Group> {
    const course = await this.courses.findOne({ where: { id: dto.courseId } });
    if (!course) {
      throw new RpcBadRequestException('Course does not exist');
    }
    await this.assertReferences(dto);
    const group = await this.groups
      .save(
        this.groups.create({
          name: dto.name,
          courseId: dto.courseId,
          teacherId: dto.teacherId ?? null,
          roomId: dto.roomId ?? null,
          branchId: dto.branchId ?? null,
          startDate: dto.startDate,
          endDate: dto.endDate ?? null,
          monthlyFee: dto.monthlyFee ?? course.price,
          capacity: dto.capacity ?? 12,
          status: dto.status ?? GroupStatus.ACTIVE,
          description: dto.description ?? null,
        }),
      )
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Group', group.id, null, this.snapshot(group));
    this.rpc.emit(EVENTS.GROUP_CREATED, { groupId: group.id, name: group.name, teacherId: group.teacherId, createdBy: meta.userId });
    return this.findOne(group.id, meta);
  }

  async update(id: string, dto: UpdateGroupDto, meta: RequestMeta): Promise<Group> {
    if (!dto || Object.keys(dto).length === 0) {
      throw new RpcBadRequestException('Nothing to update');
    }
    const group = await this.groups.findOne({ where: { id } });
    if (!group) {
      throw new RpcNotFoundException('Group not found');
    }
    await this.assertReferences(dto);
    if (dto.courseId && dto.courseId !== group.courseId) {
      const exists = await this.courses.exist({ where: { id: dto.courseId } });
      if (!exists) {
        throw new RpcBadRequestException('Course does not exist');
      }
    }
    const before = this.snapshot(group);
    const teacherChanged = dto.teacherId !== undefined && dto.teacherId !== group.teacherId;
    if (teacherChanged && dto.teacherId) {
      await this.assertTeacherFree(group.id, dto.teacherId);
    }
    Object.assign(group, {
      ...dto,
      teacherId: dto.teacherId === undefined ? group.teacherId : dto.teacherId,
      roomId: dto.roomId === undefined ? group.roomId : dto.roomId,
      branchId: dto.branchId === undefined ? group.branchId : dto.branchId,
      endDate: dto.endDate === undefined ? group.endDate : dto.endDate,
      description: dto.description === undefined ? group.description : dto.description,
    });
    const saved = await this.groups.save(group).catch(translateDatabaseError);
    if (teacherChanged) {
      await this.lessons.update(
        { groupId: id, status: LessonStatus.PLANNED, date: MoreThanOrEqual(toDateOnly(new Date())) },
        { teacherId: saved.teacherId },
      );
    }
    this.audit.publish(meta, AuditAction.UPDATE, 'Group', id, before, this.snapshot(saved));
    this.rpc.emit(EVENTS.GROUP_UPDATED, {
      groupId: id,
      name: saved.name,
      teacherId: saved.teacherId,
      previousTeacherId: before.teacherId,
      changes: Object.keys(dto),
      updatedBy: meta.userId,
    });
    return this.findOne(id, meta);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const group = await this.groups.findOne({ where: { id } });
    if (!group) {
      throw new RpcNotFoundException('Group not found');
    }
    const active = await this.enrollments.count({ where: { groupId: id, status: EnrollmentStatus.ACTIVE } });
    if (active > 0) {
      throw new RpcBadRequestException('Group still has active students');
    }
    await this.groups.softRemove(group);
    this.audit.publish(meta, AuditAction.DELETE, 'Group', id, this.snapshot(group), null);
    return { deleted: true };
  }

  async resolveTeacherId(meta: RequestMeta): Promise<string | null> {
    const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
    return teacher?.id ?? null;
  }

  async assertCanAccess(groupId: string, meta: RequestMeta): Promise<Group> {
    return this.findOne(groupId, meta);
  }

  private baseQuery(): SelectQueryBuilder<Group> {
    return this.groups
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.teacher', 'teacher')
      .leftJoinAndSelect('group.room', 'room')
      .leftJoinAndSelect('group.branch', 'branch')
      .loadRelationCountAndMap('group.studentsCount', 'group.enrollments', 'activeEnrollment', (sub) =>
        sub.andWhere('activeEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ACTIVE }),
      );
  }

  private async applyScope(qb: SelectQueryBuilder<Group>, meta: RequestMeta): Promise<void> {
    if (isTeacherScoped(meta)) {
      qb.andWhere('group.teacherId = :scopedTeacherId', { scopedTeacherId: (await this.resolveTeacherId(meta)) ?? NIL_UUID });
    } else if (isStudentScoped(meta)) {
      const student = await this.students.findOne({ where: { userId: meta.userId } });
      qb.andWhere('EXISTS (SELECT 1 FROM group_students gs WHERE gs."groupId" = group.id AND gs."studentId" = :scopedStudentId)', {
        scopedStudentId: student?.id ?? NIL_UUID,
      });
    }
  }

  private async assertTeacherFree(groupId: string, teacherId: string): Promise<void> {
    const ownSlots = await this.schedules.find({ where: { groupId } });
    if (ownSlots.length === 0) {
      return;
    }
    const otherGroups = await this.groups.find({ where: { teacherId, status: In([GroupStatus.ACTIVE, GroupStatus.PAUSED]) }, select: { id: true } });
    const otherGroupIds = otherGroups.map((other) => other.id).filter((otherId) => otherId !== groupId);
    if (otherGroupIds.length === 0) {
      return;
    }
    const otherSlots = await this.schedules.find({ where: { groupId: In(otherGroupIds) }, relations: { group: true } });
    const toSlot = (slot: Schedule, slotTeacherId: string): ScheduleSlotLike => ({
      id: slot.id,
      groupId: slot.groupId,
      roomId: null,
      teacherId: slotTeacherId,
      weekday: slot.weekday,
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      effectiveFrom: slot.effectiveFrom,
      effectiveTo: slot.effectiveTo,
    });
    const existing = otherSlots.map((slot) => toSlot(slot, teacherId));
    for (const slot of ownSlots) {
      const conflicts = detectConflicts(toSlot(slot, teacherId), existing).filter((conflict) => conflict.kind === 'TEACHER');
      if (conflicts.length > 0) {
        const names = conflicts.map((conflict) => otherSlots.find((other) => other.id === conflict.scheduleId)?.group?.name ?? conflict.groupId);
        throw new RpcBadRequestException(`Teacher is already busy at this time with ${[...new Set(names)].join(', ')}`);
      }
    }
  }

  private async assertReferences(dto: Partial<CreateGroupDto>): Promise<void> {
    if (dto.teacherId) {
      const exists = await this.teachers.exist({ where: { id: dto.teacherId } });
      if (!exists) throw new RpcBadRequestException('Teacher does not exist');
    }
    if (dto.roomId) {
      const exists = await this.rooms.exist({ where: { id: dto.roomId } });
      if (!exists) throw new RpcBadRequestException('Room does not exist');
    }
    if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
      throw new RpcBadRequestException('End date must be after start date');
    }
  }

  private snapshot(group: Group): Record<string, unknown> & { teacherId: string | null } {
    return {
      name: group.name,
      courseId: group.courseId,
      teacherId: group.teacherId,
      roomId: group.roomId,
      startDate: group.startDate,
      endDate: group.endDate,
      monthlyFee: group.monthlyFee,
      capacity: group.capacity,
      status: group.status,
    };
  }

  assertNotStudent(meta: RequestMeta): void {
    if (isStudentScoped(meta)) {
      throw new RpcForbiddenException('Students cannot view this information');
    }
  }

  assertStaffOnly(meta: RequestMeta): void {
    if (isTeacherScoped(meta) || isStudentScoped(meta)) {
      throw new RpcForbiddenException('Only staff can manage enrollments');
    }
  }
}
