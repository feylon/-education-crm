import { cleanQuery, http, unwrap } from './http';
import type { AuditLog, ListQuery, Paginated, Permission, Role, User } from './types';

export interface UserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleIds: string[];
  isActive?: boolean;
}

export interface RolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

export const usersApi = {
  list: (query: ListQuery) => unwrap<Paginated<User>>(http.get('/users', { params: cleanQuery(query) })),
  get: (id: string) => unwrap<User>(http.get(`/users/${id}`)),
  create: (payload: UserPayload) => unwrap<User>(http.post('/users', payload)),
  update: (id: string, payload: Partial<UserPayload>) => unwrap<User>(http.patch(`/users/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/users/${id}`)),
  roles: () => unwrap<Role[]>(http.get('/roles')),
  createRole: (payload: RolePayload) => unwrap<Role>(http.post('/roles', payload)),
  updateRole: (id: string, payload: Partial<RolePayload>) => unwrap<Role>(http.patch(`/roles/${id}`, payload)),
  removeRole: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/roles/${id}`)),
  permissions: () => unwrap<Permission[]>(http.get('/permissions')),
  auditLogs: (query: ListQuery) => unwrap<Paginated<AuditLog>>(http.get('/audit-logs', { params: cleanQuery(query) })),
};
