import { cleanQuery, http, unwrap } from './http';
import type { ListQuery, Paginated, SalaryType, Teacher, TeacherDashboard, TeacherProfile, TeacherStatus } from './types';

export interface TeacherPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  specialization?: string;
  bio?: string;
  photoUrl?: string;
  hireDate?: string;
  salaryType?: SalaryType;
  salaryAmount?: number;
  status?: TeacherStatus;
  branchId?: string;
}

export const teachersApi = {
  list: (query: ListQuery) => unwrap<Paginated<Teacher>>(http.get('/teachers', { params: cleanQuery(query) })),
  lookup: (search: string) => unwrap<Teacher[]>(http.get('/teachers/lookup', { params: cleanQuery({ search }) })),
  get: (id: string) => unwrap<Teacher>(http.get(`/teachers/${id}`)),
  profile: (id: string) => unwrap<TeacherProfile>(http.get(`/teachers/${id}/profile`)),
  dashboard: (id: string) => unwrap<TeacherDashboard>(http.get(`/teachers/${id}/dashboard`)),
  me: () => unwrap<TeacherDashboard>(http.get('/teachers/me')),
  create: (payload: TeacherPayload) => unwrap<Teacher>(http.post('/teachers', payload)),
  update: (id: string, payload: Partial<TeacherPayload>) => unwrap<Teacher>(http.patch(`/teachers/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/teachers/${id}`)),
};
