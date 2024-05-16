import { AttendanceStatus } from '../enums';
import { summarizeAttendance } from './attendance.util';

describe('summarizeAttendance', () => {
  it('counts every status and treats late as attended', () => {
    const summary = summarizeAttendance([
      AttendanceStatus.PRESENT,
      AttendanceStatus.PRESENT,
      AttendanceStatus.LATE,
      AttendanceStatus.ABSENT,
      AttendanceStatus.EXCUSED,
    ]);
    expect(summary).toEqual({ total: 5, present: 2, absent: 1, late: 1, excused: 1, attendanceRate: 60 });
  });

  it('returns zero rate for no records', () => {
    expect(summarizeAttendance([]).attendanceRate).toBe(0);
  });
});
