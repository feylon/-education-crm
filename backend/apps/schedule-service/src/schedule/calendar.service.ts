import { CalendarQueryDto } from '@app/common/dto';
import { GroupStatus, LessonStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { addDays, isoWeekday, isStudentScoped, isTeacherScoped, toDateOnly } from '@app/common/utils';
import { Lesson, Schedule, Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcBadRequestException } from '@app/common/rpc';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface CalendarEvent {
  id: string;
  kind: 'LESSON' | 'SLOT';
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  groupId: string;
  groupName: string;
  courseName: string | null;
  color: string | null;
  teacherId: string | null;
  teacherName: string | null;
  roomId: string | null;
  roomName: string | null;
  status: LessonStatus | null;
  topic: string | null;
  scheduleId: string | null;
}

export interface CalendarView {
  from: string;
  to: string;
  events: CalendarEvent[];
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
  ) {}

  async build(query: CalendarQueryDto, meta: RequestMeta): Promise<CalendarView> {
    const from = query.from ?? toDateOnly(this.startOfWeek(new Date()));
    const to = query.to ?? toDateOnly(addDays(new Date(from), 6));
    if (to < from) {
      throw new RpcBadRequestException('Range end must be after start');
    }
    if ((new Date(to).getTime() - new Date(from).getTime()) / 86400000 > 62) {
      throw new RpcBadRequestException('Range cannot exceed 62 days');
    }
    const scope = await this.scopeFilters(meta);
    const slotsQb = this.schedules
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('group.teacher', 'teacher')
      .leftJoinAndSelect('schedule.room', 'room')
      .where('group.status = :active', { active: GroupStatus.ACTIVE })
      .andWhere('schedule.effectiveFrom <= :to', { to })
      .andWhere('(schedule.effectiveTo IS NULL OR schedule.effectiveTo >= :from)', { from });
    const lessonsQb = this.lessons
      .createQueryBuilder('lesson')
      .innerJoinAndSelect('lesson.group', 'group')
      .leftJoinAndSelect('group.course', 'course')
      .leftJoinAndSelect('lesson.teacher', 'teacher')
      .leftJoinAndSelect('lesson.room', 'room')
      .where('lesson.date BETWEEN :from AND :to', { from, to });
    for (const qb of [slotsQb, lessonsQb]) {
      if (query.groupId) qb.andWhere('group.id = :groupId', { groupId: query.groupId });
      if (query.branchId) qb.andWhere('group.branchId = :branchId', { branchId: query.branchId });
      if (scope.teacherId) qb.andWhere('group.teacherId = :scopedTeacherId', { scopedTeacherId: scope.teacherId });
      if (scope.studentId) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM group_students gs WHERE gs."groupId" = group.id AND gs."studentId" = :scopedStudentId AND gs.status = \'ACTIVE\')',
          { scopedStudentId: scope.studentId },
        );
      }
    }
    if (query.teacherId) {
      slotsQb.andWhere('group.teacherId = :teacherId', { teacherId: query.teacherId });
      lessonsQb.andWhere('lesson.teacherId = :teacherId', { teacherId: query.teacherId });
    }
    if (query.roomId) {
      slotsQb.andWhere('schedule.roomId = :roomId', { roomId: query.roomId });
      lessonsQb.andWhere('lesson.roomId = :roomId', { roomId: query.roomId });
    }
    const [slots, lessons] = await Promise.all([slotsQb.getMany(), lessonsQb.getMany()]);
    const events: CalendarEvent[] = lessons.map((lesson) => ({
      id: lesson.id,
      kind: 'LESSON',
      date: lesson.date,
      weekday: isoWeekday(new Date(lesson.date)),
      startTime: lesson.startTime.slice(0, 5),
      endTime: lesson.endTime.slice(0, 5),
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      courseName: lesson.group.course?.name ?? null,
      color: lesson.group.course?.color ?? null,
      teacherId: lesson.teacherId,
      teacherName: lesson.teacher ? `${lesson.teacher.lastName} ${lesson.teacher.firstName}` : null,
      roomId: lesson.roomId,
      roomName: lesson.room?.name ?? null,
      status: lesson.status,
      topic: lesson.topic,
      scheduleId: lesson.scheduleId,
    }));
    const covered = new Set(lessons.map((lesson) => `${lesson.groupId}|${lesson.date}|${lesson.startTime.slice(0, 5)}`));
    for (let cursor = new Date(from); toDateOnly(cursor) <= to; cursor = addDays(cursor, 1)) {
      const date = toDateOnly(cursor);
      const weekday = isoWeekday(cursor);
      for (const slot of slots) {
        if (slot.weekday !== weekday || slot.effectiveFrom > date || (slot.effectiveTo && slot.effectiveTo < date)) {
          continue;
        }
        const startTime = slot.startTime.slice(0, 5);
        if (covered.has(`${slot.groupId}|${date}|${startTime}`)) {
          continue;
        }
        events.push({
          id: `${slot.id}:${date}`,
          kind: 'SLOT',
          date,
          weekday,
          startTime,
          endTime: slot.endTime.slice(0, 5),
          groupId: slot.groupId,
          groupName: slot.group.name,
          courseName: slot.group.course?.name ?? null,
          color: slot.group.course?.color ?? null,
          teacherId: slot.group.teacherId,
          teacherName: slot.group.teacher ? `${slot.group.teacher.lastName} ${slot.group.teacher.firstName}` : null,
          roomId: slot.roomId,
          roomName: slot.room?.name ?? null,
          status: null,
          topic: null,
          scheduleId: slot.id,
        });
      }
    }
    events.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.groupName.localeCompare(b.groupName));
    return { from, to, events };
  }

  private startOfWeek(date: Date): Date {
    return addDays(date, 1 - isoWeekday(date));
  }

  private async scopeFilters(meta: RequestMeta): Promise<{ teacherId?: string; studentId?: string }> {
    if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      return { teacherId: teacher?.id ?? NIL_UUID };
    }
    if (isStudentScoped(meta)) {
      const student = await this.students.findOne({ where: { userId: meta.userId } });
      return { studentId: student?.id ?? NIL_UUID };
    }
    return {};
  }
}
