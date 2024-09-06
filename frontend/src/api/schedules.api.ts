import { cleanQuery, http, unwrap } from './http';
import type { Branch, CalendarView, ConflictReport, ListQuery, Paginated, Room, Schedule } from './types';

export interface SchedulePayload {
  groupId: string;
  roomId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface BranchPayload {
  name: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface RoomPayload {
  branchId: string;
  name: string;
  capacity?: number;
  isActive?: boolean;
}

export interface CalendarQuery {
  from?: string;
  to?: string;
  groupId?: string;
  teacherId?: string;
  roomId?: string;
}

export const schedulesApi = {
  list: (query: ListQuery) => unwrap<Paginated<Schedule>>(http.get('/schedules', { params: cleanQuery(query) })),
  calendar: (query: CalendarQuery) => unwrap<CalendarView>(http.get('/schedules/calendar', { params: cleanQuery(query) })),
  checkConflicts: (payload: SchedulePayload & { id?: string }) => unwrap<ConflictReport>(http.post('/schedules/check-conflicts', payload)),
  create: (payload: SchedulePayload) => unwrap<Schedule>(http.post('/schedules', payload)),
  update: (id: string, payload: Partial<SchedulePayload>) => unwrap<Schedule>(http.patch(`/schedules/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/schedules/${id}`)),
  branches: () => unwrap<Branch[]>(http.get('/branches')),
  createBranch: (payload: BranchPayload) => unwrap<Branch>(http.post('/branches', payload)),
  updateBranch: (id: string, payload: Partial<BranchPayload>) => unwrap<Branch>(http.patch(`/branches/${id}`, payload)),
  removeBranch: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/branches/${id}`)),
  rooms: (branchId?: string) => unwrap<Room[]>(http.get('/rooms', { params: cleanQuery({ branchId }) })),
  createRoom: (payload: RoomPayload) => unwrap<Room>(http.post('/rooms', payload)),
  updateRoom: (id: string, payload: Partial<RoomPayload>) => unwrap<Room>(http.patch(`/rooms/${id}`, payload)),
  removeRoom: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/rooms/${id}`)),
};
