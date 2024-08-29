import { REPORT_PATTERNS } from '@app/common/constants';
import { ReportRangeQueryDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, Meta, RequirePermissions } from '../../common';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get('dashboard')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Admin dashboard: counters, today figures, debt, charts, recent activity' })
  @ApiOkEnvelope()
  dashboard(@Meta() meta: RequestMeta) {
    return this.rpc.send(REPORT_PATTERNS.DASHBOARD, { meta, data: {} });
  }

  @Get('revenue')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Revenue series grouped by day or month, with payment method breakdown' })
  @ApiOkEnvelope()
  revenue(@Query() query: ReportRangeQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(REPORT_PATTERNS.REVENUE, { meta, data: query });
  }

  @Get('attendance')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Attendance series and per-group rates' })
  @ApiOkEnvelope()
  attendance(@Query() query: ReportRangeQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(REPORT_PATTERNS.ATTENDANCE, { meta, data: query });
  }

  @Get('students')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Student growth and status distribution' })
  @ApiOkEnvelope()
  students(@Query() query: ReportRangeQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(REPORT_PATTERNS.STUDENTS, { meta, data: query });
  }

  @Get('recent-activity')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Recent audit activity' })
  @ApiOkEnvelope()
  recentActivity(@Meta() meta: RequestMeta) {
    return this.rpc.send(REPORT_PATTERNS.RECENT_ACTIVITY, { meta, data: {} });
  }
}
