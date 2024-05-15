import { AttendanceStatus } from '../enums';

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export const emptySummary = (): AttendanceSummary => ({
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  attendanceRate: 0,
});

export const summarizeAttendance = (statuses: AttendanceStatus[]): AttendanceSummary => {
  const summary = emptySummary();
  for (const status of statuses) {
    summary.total += 1;
    if (status === AttendanceStatus.PRESENT) summary.present += 1;
    if (status === AttendanceStatus.ABSENT) summary.absent += 1;
    if (status === AttendanceStatus.LATE) summary.late += 1;
    if (status === AttendanceStatus.EXCUSED) summary.excused += 1;
  }
  summary.attendanceRate = attendanceRate(summary);
  return summary;
};

export const attendanceRate = (summary: Pick<AttendanceSummary, 'total' | 'present' | 'late'>): number =>
  summary.total === 0 ? 0 : Math.round(((summary.present + summary.late) / summary.total) * 10000) / 100;
