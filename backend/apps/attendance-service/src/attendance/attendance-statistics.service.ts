import { AttendanceSummary, summarizeAttendance } from '@app/common/domain';
import { AttendanceStatsQueryDto, MonthlyStatsQueryDto } from '@app/common/dto';
import { AttendanceStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { AttendanceRecord } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NIL_UUID, ScopeService } from './scope.service';
import { isTeacherScoped } from '@app/common/utils';

export interface MonthlyPoint {
  month: string;
  summary: AttendanceSummary;
}

export interface GroupBreakdown extends AttendanceSummary {
  groupId: string;
  groupName: string;
}

export interface StudentBreakdown extends AttendanceSummary {
  studentId: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AttendanceStatisticsService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    private readonly scope: ScopeService,
  ) {}

  async forStudent(studentId: string, query: AttendanceStatsQueryDto, meta: RequestMeta): Promise<AttendanceSummary & { byGroup: GroupBreakdown[] }> {
    await this.scope.assertStudentAccess(studentId, meta);
    const qb = this.rangeQuery(query).andWhere('record.studentId = :studentId', { studentId });
    const rows = await qb
      .select(['record.status AS status', 'group.id AS "groupId"', 'group.name AS "groupName"'])
      .getRawMany<{ status: AttendanceStatus; groupId: string; groupName: string }>();
    return { ...summarizeAttendance(rows.map((row) => row.status)), byGroup: this.groupBy(rows) };
  }

  async forGroup(groupId: string, query: AttendanceStatsQueryDto, meta: RequestMeta): Promise<AttendanceSummary & { byStudent: StudentBreakdown[] }> {
    const qb = this.rangeQuery(query).andWhere('lesson.groupId = :groupId', { groupId });
    await this.scope.applyGroupScope(qb, 'group', meta);
    const rows = await qb
      .innerJoin('record.student', 'student')
      .select(['record.status AS status', 'student.id AS "studentId"', 'student.firstName AS "firstName"', 'student.lastName AS "lastName"'])
      .getRawMany<{ status: AttendanceStatus; studentId: string; firstName: string; lastName: string }>();
    const perStudent = new Map<string, { firstName: string; lastName: string; statuses: AttendanceStatus[] }>();
    for (const row of rows) {
      const entry = perStudent.get(row.studentId) ?? { firstName: row.firstName, lastName: row.lastName, statuses: [] };
      entry.statuses.push(row.status);
      perStudent.set(row.studentId, entry);
    }
    return {
      ...summarizeAttendance(rows.map((row) => row.status)),
      byStudent: [...perStudent.entries()]
        .map(([studentId, entry]) => ({ studentId, firstName: entry.firstName, lastName: entry.lastName, ...summarizeAttendance(entry.statuses) }))
        .sort((a, b) => a.attendanceRate - b.attendanceRate),
    };
  }

  async forTeacher(teacherId: string, query: AttendanceStatsQueryDto, meta: RequestMeta): Promise<AttendanceSummary & { byGroup: GroupBreakdown[]; lessons: number }> {
    const effectiveTeacherId = isTeacherScoped(meta) ? ((await this.scope.teacherId(meta)) ?? NIL_UUID) : teacherId;
    const qb = this.rangeQuery(query).andWhere('lesson.teacherId = :teacherId', { teacherId: effectiveTeacherId });
    const rows = await qb
      .select(['record.status AS status', 'group.id AS "groupId"', 'group.name AS "groupName"', 'lesson.id AS "lessonId"'])
      .getRawMany<{ status: AttendanceStatus; groupId: string; groupName: string; lessonId: string }>();
    return {
      ...summarizeAttendance(rows.map((row) => row.status)),
      byGroup: this.groupBy(rows),
      lessons: new Set(rows.map((row) => row.lessonId)).size,
    };
  }

  async monthly(query: MonthlyStatsQueryDto, meta: RequestMeta): Promise<MonthlyPoint[]> {
    const months = query.month ? [query.month] : Array.from({ length: 12 }, (_, index) => index + 1);
    const from = `${query.year}-${String(months[0]).padStart(2, '0')}-01`;
    const lastMonth = months[months.length - 1];
    const to = `${query.year}-${String(lastMonth).padStart(2, '0')}-${new Date(query.year, lastMonth, 0).getDate()}`;
    const qb = this.rangeQuery({ from, to });
    if (query.groupId) qb.andWhere('lesson.groupId = :groupId', { groupId: query.groupId });
    if (query.teacherId) qb.andWhere('lesson.teacherId = :teacherId', { teacherId: query.teacherId });
    await this.scope.applyGroupScope(qb, 'group', meta);
    const rows = await qb
      .select(['record.status AS status', "TO_CHAR(lesson.date, 'YYYY-MM') AS month"])
      .getRawMany<{ status: AttendanceStatus; month: string }>();
    return months.map((month) => {
      const key = `${query.year}-${String(month).padStart(2, '0')}`;
      return { month: key, summary: summarizeAttendance(rows.filter((row) => row.month === key).map((row) => row.status)) };
    });
  }

  private rangeQuery(query: AttendanceStatsQueryDto): SelectQueryBuilder<AttendanceRecord> {
    const qb = this.records.createQueryBuilder('record').innerJoin('record.lesson', 'lesson').innerJoin('lesson.group', 'group');
    if (query.from) qb.andWhere('lesson.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('lesson.date <= :to', { to: query.to });
    return qb;
  }

  private groupBy(rows: Array<{ status: AttendanceStatus; groupId: string; groupName: string }>): GroupBreakdown[] {
    const perGroup = new Map<string, { groupName: string; statuses: AttendanceStatus[] }>();
    for (const row of rows) {
      const entry = perGroup.get(row.groupId) ?? { groupName: row.groupName, statuses: [] };
      entry.statuses.push(row.status);
      perGroup.set(row.groupId, entry);
    }
    return [...perGroup.entries()].map(([groupId, entry]) => ({ groupId, groupName: entry.groupName, ...summarizeAttendance(entry.statuses) }));
  }
}
