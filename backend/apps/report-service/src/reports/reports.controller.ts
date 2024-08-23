import { REPORT_PATTERNS } from '@app/common/constants';
import { ReportRangeQueryDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardService } from './dashboard.service';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly reports: ReportsService,
  ) {}

  @MessagePattern(REPORT_PATTERNS.DASHBOARD)
  dashboardData(@Payload() payload: WithMeta<Record<string, never>>) {
    return this.dashboard.build(payload.meta);
  }

  @MessagePattern(REPORT_PATTERNS.REVENUE)
  revenue(@Payload() payload: WithMeta<ReportRangeQueryDto>) {
    return this.reports.revenue(payload.data);
  }

  @MessagePattern(REPORT_PATTERNS.ATTENDANCE)
  attendance(@Payload() payload: WithMeta<ReportRangeQueryDto>) {
    return this.reports.attendanceReport(payload.data);
  }

  @MessagePattern(REPORT_PATTERNS.STUDENTS)
  students(@Payload() payload: WithMeta<ReportRangeQueryDto>) {
    return this.reports.studentsReport(payload.data);
  }

  @MessagePattern(REPORT_PATTERNS.RECENT_ACTIVITY)
  recentActivity() {
    return this.reports.recentActivity(20);
  }
}
