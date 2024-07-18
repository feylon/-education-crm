import { ATTENDANCE_PATTERNS } from '@app/common/constants';
import {
  AttendanceStatsQueryDto,
  CreateLessonDto,
  DateRangeQueryDto,
  GenerateLessonsDto,
  LessonQueryDto,
  MarkAttendanceDto,
  MonthlyStatsQueryDto,
  StudentAttendanceHistoryQueryDto,
  UpdateLessonDto,
} from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AttendanceStatisticsService } from './attendance-statistics.service';
import { AttendanceService } from './attendance.service';
import { LessonsService } from './lessons.service';

@Controller()
export class AttendanceController {
  constructor(
    private readonly lessons: LessonsService,
    private readonly attendance: AttendanceService,
    private readonly statistics: AttendanceStatisticsService,
  ) {}

  @MessagePattern(ATTENDANCE_PATTERNS.LESSONS_FIND_ALL)
  findLessons(@Payload() payload: WithMeta<LessonQueryDto>) {
    return this.lessons.findAll(payload.data, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LESSONS_FIND_ONE)
  findLesson(@Payload() payload: WithMeta<{ id: string }>) {
    return this.lessons.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LESSONS_CREATE)
  createLesson(@Payload() payload: WithMeta<CreateLessonDto>) {
    return this.lessons.create(payload.data, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LESSONS_UPDATE)
  updateLesson(@Payload() payload: WithMeta<{ id: string; dto: UpdateLessonDto }>) {
    return this.lessons.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LESSONS_GENERATE)
  generate(@Payload() payload: WithMeta<GenerateLessonsDto>) {
    return this.lessons.generate(payload.data, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.LESSON_SHEET)
  sheet(@Payload() payload: WithMeta<{ lessonId: string }>) {
    return this.attendance.lessonSheet(payload.data.lessonId, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.MARK)
  mark(@Payload() payload: WithMeta<{ lessonId: string; dto: MarkAttendanceDto }>) {
    return this.attendance.mark(payload.data.lessonId, payload.data.dto, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.GROUP_JOURNAL)
  journal(@Payload() payload: WithMeta<{ groupId: string; query: DateRangeQueryDto }>) {
    return this.attendance.groupJournal(payload.data.groupId, payload.data.query.from, payload.data.query.to, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.STUDENT_HISTORY)
  studentHistory(@Payload() payload: WithMeta<{ studentId: string; query: StudentAttendanceHistoryQueryDto }>) {
    return this.attendance.studentHistory(payload.data.studentId, payload.data.query, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.STUDENT_STATS)
  studentStats(@Payload() payload: WithMeta<{ studentId: string; query: AttendanceStatsQueryDto }>) {
    return this.statistics.forStudent(payload.data.studentId, payload.data.query, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.GROUP_STATS)
  groupStats(@Payload() payload: WithMeta<{ groupId: string; query: AttendanceStatsQueryDto }>) {
    return this.statistics.forGroup(payload.data.groupId, payload.data.query, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.TEACHER_STATS)
  teacherStats(@Payload() payload: WithMeta<{ teacherId: string; query: AttendanceStatsQueryDto }>) {
    return this.statistics.forTeacher(payload.data.teacherId, payload.data.query, payload.meta);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.MONTHLY_STATS)
  monthly(@Payload() payload: WithMeta<MonthlyStatsQueryDto>) {
    return this.statistics.monthly(payload.data, payload.meta);
  }
}
