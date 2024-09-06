import { cleanQuery, http, unwrap } from './http';
import type { AttendanceReport, DashboardData, RevenueReport } from './types';

export interface ReportQuery {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'month';
  groupId?: string;
}

export const reportsApi = {
  dashboard: () => unwrap<DashboardData>(http.get('/reports/dashboard')),
  revenue: (query: ReportQuery) => unwrap<RevenueReport>(http.get('/reports/revenue', { params: cleanQuery(query) })),
  attendance: (query: ReportQuery) => unwrap<AttendanceReport>(http.get('/reports/attendance', { params: cleanQuery(query) })),
};
