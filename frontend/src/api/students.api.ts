import { cleanQuery, http, unwrap } from './http';
import type { Gender, ListQuery, Paginated, Parent, Student, StudentProfile, StudentStatus } from './types';

export interface ParentPayload {
  fullName: string;
  phone: string;
  relation?: string;
  isPrimary?: boolean;
}

export interface StudentPayload {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: Gender;
  birthDate?: string;
  phone: string;
  email?: string;
  passportSeries?: string;
  passportNumber?: string;
  address?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status?: StudentStatus;
  notes?: string;
  branchId?: string;
  parents?: ParentPayload[];
  accountPassword?: string;
}

export const studentsApi = {
  list: (query: ListQuery) => unwrap<Paginated<Student>>(http.get('/students', { params: cleanQuery(query) })),
  lookup: (search: string) => unwrap<Student[]>(http.get('/students/lookup', { params: cleanQuery({ search }) })),
  get: (id: string) => unwrap<Student>(http.get(`/students/${id}`)),
  profile: (id: string) => unwrap<StudentProfile>(http.get(`/students/${id}/profile`)),
  me: () => unwrap<StudentProfile>(http.get('/students/me')),
  create: (payload: StudentPayload) => unwrap<Student>(http.post('/students', payload)),
  update: (id: string, payload: Partial<StudentPayload>) => unwrap<Student>(http.patch(`/students/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/students/${id}`)),
  addParent: (id: string, payload: ParentPayload) => unwrap<Parent>(http.post(`/students/${id}/parents`, payload)),
  updateParent: (id: string, parentId: string, payload: Partial<ParentPayload>) =>
    unwrap<Parent>(http.patch(`/students/${id}/parents/${parentId}`, payload)),
  removeParent: (id: string, parentId: string) => unwrap<{ deleted: boolean }>(http.delete(`/students/${id}/parents/${parentId}`)),
};
