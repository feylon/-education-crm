import { cleanQuery, http, unwrap } from './http';
import type { Enrollment, EnrollmentStatus, Group, GroupStatistics, GroupStatus, ListQuery, Paginated } from './types';

export interface GroupPayload {
  name: string;
  courseId: string;
  teacherId?: string;
  roomId?: string;
  branchId?: string;
  startDate: string;
  endDate?: string;
  monthlyFee?: number;
  capacity?: number;
  status?: GroupStatus;
  description?: string;
}

export interface EnrollPayload {
  studentId: string;
  joinedAt?: string;
  discountPercent?: number;
  notes?: string;
}

export interface EnrollmentUpdatePayload {
  discountPercent?: number;
  status?: EnrollmentStatus;
  leftAt?: string;
  notes?: string;
}

export const groupsApi = {
  list: (query: ListQuery) => unwrap<Paginated<Group>>(http.get('/groups', { params: cleanQuery(query) })),
  lookup: (search: string) => unwrap<Group[]>(http.get('/groups/lookup', { params: cleanQuery({ search }) })),
  get: (id: string) => unwrap<Group>(http.get(`/groups/${id}`)),
  statistics: (id: string) => unwrap<GroupStatistics>(http.get(`/groups/${id}/statistics`)),
  students: (id: string, query: ListQuery) => unwrap<Paginated<Enrollment>>(http.get(`/groups/${id}/students`, { params: cleanQuery(query) })),
  create: (payload: GroupPayload) => unwrap<Group>(http.post('/groups', payload)),
  update: (id: string, payload: Partial<GroupPayload>) => unwrap<Group>(http.patch(`/groups/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/groups/${id}`)),
  enroll: (id: string, payload: EnrollPayload) => unwrap<Enrollment>(http.post(`/groups/${id}/students`, payload)),
  updateEnrollment: (id: string, enrollmentId: string, payload: EnrollmentUpdatePayload) =>
    unwrap<Enrollment>(http.patch(`/groups/${id}/students/${enrollmentId}`, payload)),
  unenroll: (id: string, enrollmentId: string) => unwrap<Enrollment>(http.delete(`/groups/${id}/students/${enrollmentId}`)),
};
