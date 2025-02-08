import { ATTENDANCE_PATTERNS } from '@app/common/constants';
import { AttendanceStatsQueryDto, DateRangeQueryDto, MonthlyStatsQueryDto, StudentAttendanceHistoryQueryDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, Meta, RequirePermissions } from '../../common';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get('groups/:groupId/journal')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Group journal: students x lessons matrix' })
  @ApiOkEnvelope()
  journal(@Param('groupId', ParseUUIDPipe) groupId: string, @Query() query: DateRangeQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.GROUP_JOURNAL, { meta, data: { groupId, query } });
  }

  @Get('groups/:groupId/stats')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Group attendance statistics with per-student breakdown' })
  @ApiOkEnvelope()
  groupStats(@Param('groupId', ParseUUIDPipe) groupId: string, @Query() query: AttendanceStatsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.GROUP_STATS, { meta, data: { groupId, query } });
  }

  @Get('students/:studentId/stats')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Student attendance statistics (students may view their own)' })
  @ApiOkEnvelope()
  studentStats(@Param('studentId', ParseUUIDPipe) studentId: string, @Query() query: AttendanceStatsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.STUDENT_STATS, { meta, data: { studentId, query } });
  }

  @Get('students/:studentId/history')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Student attendance history' })
  @ApiOkEnvelope()
  studentHistory(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: StudentAttendanceHistoryQueryDto,
    @Meta() meta: RequestMeta,
  ) {
    return this.rpc.send(ATTENDANCE_PATTERNS.STUDENT_HISTORY, { meta, data: { studentId, query } });
  }

  @Get('teachers/:teacherId/stats')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Teacher attendance statistics' })
  @ApiOkEnvelope()
  teacherStats(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Query() query: AttendanceStatsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.TEACHER_STATS, { meta, data: { teacherId, query } });
  }

  @Get('monthly')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Monthly attendance series' })
  @ApiOkEnvelope()
  monthly(@Query() query: MonthlyStatsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.MONTHLY_STATS, { meta, data: query });
  }
}
