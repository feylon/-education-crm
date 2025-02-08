import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { MarkAttendanceDto, StudentAttendanceHistoryQueryDto } from '@app/common/dto';
import { AttendanceStatus, AuditAction, EnrollmentStatus, LessonStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService } from '@app/common/rpc';
import { applySorting, paginateQuery } from '@app/common/utils';
import { AttendanceRecord, GroupStudent, Lesson, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LessonsService } from './lessons.service';
import { ScopeService } from './scope.service';

export interface LessonSheetRow {
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string | null;
  enrollmentStatus: EnrollmentStatus;
  status: AttendanceStatus | null;
  note: string | null;
}

export interface LessonSheet {
  lesson: Lesson;
  rows: LessonSheetRow[];
}

export interface JournalCell {
  lessonId: string;
  status: AttendanceStatus | null;
}

export interface GroupJournal {
  lessons: Lesson[];
  students: Array<{ studentId: string; firstName: string; lastName: string; cells: JournalCell[]; attendanceRate: number }>;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    private readonly dataSource: DataSource,
    private readonly lessonsService: LessonsService,
    private readonly scope: ScopeService,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async lessonSheet(lessonId: string, meta: RequestMeta): Promise<LessonSheet> {
    const lesson = await this.lessonsService.findOne(lessonId, meta);
    const ownStudentId = await this.scope.ownStudentFilter(meta);
    const [enrollments, records] = await Promise.all([
      this.enrollments.find({ where: { groupId: lesson.groupId }, relations: { student: true } }),
      this.records.find({ where: { lessonId } }),
    ]);
    const recordByStudent = new Map(records.map((record) => [record.studentId, record]));
    const rows = enrollments
      .filter((enrollment) => enrollment.student !== null)
      .filter((enrollment) => ownStudentId === null || enrollment.studentId === ownStudentId)
      .filter((enrollment) => enrollment.status === EnrollmentStatus.ACTIVE || recordByStudent.has(enrollment.studentId))
      .filter((enrollment) => enrollment.joinedAt <= lesson.date && (!enrollment.leftAt || enrollment.leftAt >= lesson.date || recordByStudent.has(enrollment.studentId)))
      .map<LessonSheetRow>((enrollment) => ({
        studentId: enrollment.studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        phone: enrollment.student.phone,
        photoUrl: enrollment.student.photoUrl,
        enrollmentStatus: enrollment.status,
        status: recordByStudent.get(enrollment.studentId)?.status ?? null,
        note: recordByStudent.get(enrollment.studentId)?.note ?? null,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    return { lesson, rows };
  }

  async mark(lessonId: string, dto: MarkAttendanceDto, meta: RequestMeta): Promise<LessonSheet> {
    const lesson = await this.lessonsService.findOne(lessonId, meta);
    await this.scope.assertGroupAccess(lesson.groupId, meta);
    if (lesson.status === LessonStatus.CANCELLED) {
      throw new RpcBadRequestException('Cannot mark attendance for a cancelled lesson');
    }
    const enrolled = new Set(
      (await this.enrollments.find({ where: { groupId: lesson.groupId }, select: { studentId: true } })).map((row) => row.studentId),
    );
    const unknown = dto.records.filter((record) => !enrolled.has(record.studentId)).map((record) => record.studentId);
    if (unknown.length) {
      throw new RpcBadRequestException('Some students are not enrolled in this group', unknown);
    }
    const existing = await this.records.find({ where: { lessonId } });
    const existingByStudent = new Map(existing.map((record) => [record.studentId, record]));
    const previous: Record<string, AttendanceStatus | null> = {};
    const next: Record<string, AttendanceStatus> = {};
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AttendanceRecord);
      for (const entry of dto.records) {
        const record = existingByStudent.get(entry.studentId) ?? repo.create({ lessonId, studentId: entry.studentId });
        previous[entry.studentId] = existingByStudent.get(entry.studentId)?.status ?? null;
        next[entry.studentId] = entry.status;
        record.status = entry.status;
        record.note = entry.note ?? null;
        record.markedById = meta.userId;
        await repo.save(record);
      }
      const patch: Partial<Lesson> = { status: LessonStatus.COMPLETED };
      if (dto.topic !== undefined) {
        patch.topic = dto.topic;
      }
      await manager.getRepository(Lesson).update(lessonId, patch);
    });
    this.audit.publish(meta, AuditAction.MARK_ATTENDANCE, 'Lesson', lessonId, { statuses: previous }, { statuses: next });
    this.rpc.emit(EVENTS.ATTENDANCE_MARKED, {
      lessonId,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      date: lesson.date,
      markedBy: meta.userId,
      records: dto.records.map((record) => ({ studentId: record.studentId, status: record.status })),
    });
    return this.lessonSheet(lessonId, meta);
  }

  async groupJournal(groupId: string, from: string | undefined, to: string | undefined, meta: RequestMeta): Promise<GroupJournal> {
    await this.scope.assertGroupReadAccess(groupId, meta);
    const ownStudentId = await this.scope.ownStudentFilter(meta);
    const lessonsQb = this.lessons
      .createQueryBuilder('lesson')
      .innerJoin('lesson.group', 'group')
      .where('lesson.groupId = :groupId', { groupId })
      .andWhere('lesson.status != :cancelled', { cancelled: LessonStatus.CANCELLED })
      .orderBy('lesson.date', 'ASC')
      .addOrderBy('lesson.startTime', 'ASC');
    if (from) lessonsQb.andWhere('lesson.date >= :from', { from });
    if (to) lessonsQb.andWhere('lesson.date <= :to', { to });
    await this.scope.applyGroupScope(lessonsQb, 'group', meta);
    const lessons = await lessonsQb.take(60).getMany();
    const enrollments = (await this.enrollments.find({ where: { groupId }, relations: { student: true }, order: { status: 'ASC' } })).filter(
      (enrollment) => enrollment.student !== null && (ownStudentId === null || enrollment.studentId === ownStudentId),
    );
    const lessonIds = lessons.map((lesson) => lesson.id);
    const records = lessonIds.length
      ? await this.records.createQueryBuilder('record').where('record.lessonId IN (:...lessonIds)', { lessonIds }).getMany()
      : [];
    const byKey = new Map(records.map((record) => [`${record.lessonId}|${record.studentId}`, record.status]));
    return {
      lessons,
      students: enrollments.map((enrollment) => {
        const cells = lessons.map<JournalCell>((lesson) => ({
          lessonId: lesson.id,
          status: byKey.get(`${lesson.id}|${enrollment.studentId}`) ?? null,
        }));
        const marked = cells.filter((cell) => cell.status !== null);
        const attended = marked.filter((cell) => cell.status === AttendanceStatus.PRESENT || cell.status === AttendanceStatus.LATE);
        return {
          studentId: enrollment.studentId,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          cells,
          attendanceRate: marked.length ? Math.round((attended.length / marked.length) * 10000) / 100 : 0,
        };
      }),
    };
  }

  async studentHistory(studentId: string, query: StudentAttendanceHistoryQueryDto, meta: RequestMeta): Promise<Paginated<AttendanceRecord>> {
    await this.scope.assertStudentAccess(studentId, meta);
    const qb = this.records
      .createQueryBuilder('record')
      .innerJoinAndSelect('record.lesson', 'lesson')
      .innerJoinAndSelect('lesson.group', 'group')
      .where('record.studentId = :studentId', { studentId });
    if (query.groupId) qb.andWhere('lesson.groupId = :groupId', { groupId: query.groupId });
    if (query.status) qb.andWhere('record.status = :status', { status: query.status });
    if (query.from) qb.andWhere('lesson.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('lesson.date <= :to', { to: query.to });
    applySorting(qb, 'lesson', { ...query, sortBy: 'date' }, ['date'], 'date');
    return paginateQuery(qb, query);
  }

  studentEntity(): Repository<Student> {
    return this.dataSource.getRepository(Student);
  }
}
