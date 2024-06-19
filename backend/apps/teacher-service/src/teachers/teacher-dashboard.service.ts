import { summarizeAttendance } from '@app/common/domain';
import { AttendanceStatus, EnrollmentStatus, GroupStatus, LessonStatus } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { isoWeekday, startOfMonth, toDateOnly } from '@app/common/utils';
import { AttendanceRecord, Group, GroupStudent, Lesson, Schedule, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, MoreThan, Repository } from 'typeorm';
import { TeachersService } from './teachers.service';

export interface TeacherProfile {
  teacher: Teacher;
  groups: Group[];
  schedule: Schedule[];
  statistics: {
    activeGroups: number;
    students: number;
    lessonsThisMonth: number;
    lessonsTotal: number;
    attendance: ReturnType<typeof summarizeAttendance>;
  };
}

export interface TeacherDashboard extends TeacherProfile {
  todayLessons: Lesson[];
  upcomingLessons: Lesson[];
  unmarkedLessons: Lesson[];
}

@Injectable()
export class TeacherDashboardService {
  constructor(
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    private readonly teachers: TeachersService,
  ) {}

  async profile(id: string, meta: RequestMeta): Promise<TeacherProfile> {
    const teacher = await this.teachers.findOne(id, meta);
    return this.buildProfile(teacher);
  }

  async dashboard(meta: RequestMeta, teacherId?: string): Promise<TeacherDashboard> {
    const teacher = teacherId ? await this.teachers.findOne(teacherId, meta) : await this.teachers.findMine(meta);
    const profile = await this.buildProfile(teacher);
    const today = toDateOnly(new Date());
    const [todayLessons, upcomingLessons, unmarkedLessons] = await Promise.all([
      this.lessons.find({
        where: { teacherId: teacher.id, date: today },
        relations: { group: { course: true }, room: true },
        order: { startTime: 'ASC' },
      }),
      this.lessons.find({
        where: { teacherId: teacher.id, date: MoreThan(today), status: LessonStatus.PLANNED },
        relations: { group: { course: true }, room: true },
        order: { date: 'ASC', startTime: 'ASC' },
        take: 10,
      }),
      this.lessons
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.group', 'group')
        .where('lesson.teacherId = :teacherId', { teacherId: teacher.id })
        .andWhere('lesson.date <= :today', { today })
        .andWhere('lesson.status != :cancelled', { cancelled: LessonStatus.CANCELLED })
        .andWhere('NOT EXISTS (SELECT 1 FROM attendance_records ar WHERE ar."lessonId" = lesson.id)')
        .orderBy('lesson.date', 'DESC')
        .take(10)
        .getMany(),
    ]);
    return { ...profile, todayLessons, upcomingLessons, unmarkedLessons };
  }

  private async buildProfile(teacher: Teacher): Promise<TeacherProfile> {
    const groups = await this.groups.find({
      where: { teacherId: teacher.id },
      relations: { course: true, room: true },
      order: { status: 'ASC', name: 'ASC' },
    });
    const groupIds = groups.map((group) => group.id);
    const now = new Date();
    const [schedule, students, lessonsThisMonth, lessonsTotal, statuses] = groupIds.length
      ? await Promise.all([
          this.schedules.find({ where: { groupId: In(groupIds) }, relations: { group: true, room: true }, order: { weekday: 'ASC', startTime: 'ASC' } }),
          this.enrollments.count({ where: { groupId: In(groupIds), status: EnrollmentStatus.ACTIVE } }),
          this.lessons.count({ where: { teacherId: teacher.id, date: Between(toDateOnly(startOfMonth(now)), toDateOnly(now)) } }),
          this.lessons.count({ where: { teacherId: teacher.id } }),
          this.attendance
            .createQueryBuilder('record')
            .innerJoin('record.lesson', 'lesson')
            .select('record.status', 'status')
            .where('lesson.teacherId = :teacherId', { teacherId: teacher.id })
            .getRawMany<{ status: AttendanceStatus }>(),
        ])
      : [[], 0, 0, 0, []];
    const todayWeekday = isoWeekday(now);
    return {
      teacher,
      groups,
      schedule: schedule.sort((a, b) => ((a.weekday - todayWeekday + 7) % 7) - ((b.weekday - todayWeekday + 7) % 7) || a.startTime.localeCompare(b.startTime)),
      statistics: {
        activeGroups: groups.filter((group) => group.status === GroupStatus.ACTIVE).length,
        students,
        lessonsThisMonth,
        lessonsTotal,
        attendance: summarizeAttendance(statuses.map((row) => row.status)),
      },
    };
  }
}
