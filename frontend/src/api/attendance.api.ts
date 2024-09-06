import { cleanQuery, http, unwrap } from './http';
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  GenerationResult,
  GroupJournal,
  Lesson,
  LessonSheet,
  LessonStatus,
  ListQuery,
  Paginated,
} from './types';

export interface LessonPayload {
  groupId: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  topic?: string;
  status?: LessonStatus;
}

export interface MarkAttendancePayload {
  records: Array<{ studentId: string; status: AttendanceStatus; note?: string }>;
  topic?: string;
}

export interface MonthlyPoint {
  month: string;
  summary: AttendanceSummary;
}

export const attendanceApi = {
  lessons: (query: ListQuery) => unwrap<Paginated<Lesson>>(http.get('/lessons', { params: cleanQuery(query) })),
  lesson: (id: string) => unwrap<Lesson>(http.get(`/lessons/${id}`)),
  createLesson: (payload: LessonPayload) => unwrap<Lesson>(http.post('/lessons', payload)),
  updateLesson: (id: string, payload: Partial<LessonPayload>) => unwrap<Lesson>(http.patch(`/lessons/${id}`, payload)),
  generate: (payload: { from: string; to: string; groupId?: string }) => unwrap<GenerationResult>(http.post('/lessons/generate', payload)),
  sheet: (lessonId: string) => unwrap<LessonSheet>(http.get(`/lessons/${lessonId}/attendance`)),
  mark: (lessonId: string, payload: MarkAttendancePayload) => unwrap<LessonSheet>(http.put(`/lessons/${lessonId}/attendance`, payload)),
  journal: (groupId: string, from?: string, to?: string) =>
    unwrap<GroupJournal>(http.get(`/attendance/groups/${groupId}/journal`, { params: cleanQuery({ from, to }) })),
  groupStats: (groupId: string, from?: string, to?: string) =>
    unwrap<AttendanceSummary & { byStudent: Array<AttendanceSummary & { studentId: string; firstName: string; lastName: string }> }>(
      http.get(`/attendance/groups/${groupId}/stats`, { params: cleanQuery({ from, to }) }),
    ),
  studentStats: (studentId: string, from?: string, to?: string) =>
    unwrap<AttendanceSummary & { byGroup: Array<AttendanceSummary & { groupId: string; groupName: string }> }>(
      http.get(`/attendance/students/${studentId}/stats`, { params: cleanQuery({ from, to }) }),
    ),
  studentHistory: (studentId: string, query: ListQuery) =>
    unwrap<Paginated<AttendanceRecord>>(http.get(`/attendance/students/${studentId}/history`, { params: cleanQuery(query) })),
  teacherStats: (teacherId: string, from?: string, to?: string) =>
    unwrap<AttendanceSummary & { byGroup: Array<AttendanceSummary & { groupId: string; groupName: string }>; lessons: number }>(
      http.get(`/attendance/teachers/${teacherId}/stats`, { params: cleanQuery({ from, to }) }),
    ),
  monthly: (year: number, groupId?: string, teacherId?: string) =>
    unwrap<MonthlyPoint[]>(http.get('/attendance/monthly', { params: cleanQuery({ year, groupId, teacherId }) })),
};
