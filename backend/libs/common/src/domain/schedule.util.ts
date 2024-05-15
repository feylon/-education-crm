import { rangesOverlap } from '../utils/date.util';

export interface ScheduleSlotLike {
  id?: string;
  groupId: string;
  roomId?: string | null;
  teacherId?: string | null;
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

const dateRangesOverlap = (
  fromA: string,
  toA: string | null | undefined,
  fromB: string,
  toB: string | null | undefined,
): boolean => {
  const endA = toA ?? '9999-12-31';
  const endB = toB ?? '9999-12-31';
  return fromA <= endB && fromB <= endA;
};

export const slotsCollide = (candidate: ScheduleSlotLike, existing: ScheduleSlotLike): boolean => {
  if (candidate.id && candidate.id === existing.id) {
    return false;
  }
  if (candidate.weekday !== existing.weekday) {
    return false;
  }
  if (!rangesOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
    return false;
  }
  return dateRangesOverlap(candidate.effectiveFrom, candidate.effectiveTo, existing.effectiveFrom, existing.effectiveTo);
};

export type ConflictKind = 'TEACHER' | 'ROOM' | 'GROUP';

export interface ScheduleConflict {
  kind: ConflictKind;
  scheduleId?: string;
  groupId: string;
}

export const detectConflicts = (candidate: ScheduleSlotLike, existing: ScheduleSlotLike[]): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  for (const slot of existing) {
    if (!slotsCollide(candidate, slot)) {
      continue;
    }
    if (slot.groupId === candidate.groupId) {
      conflicts.push({ kind: 'GROUP', scheduleId: slot.id, groupId: slot.groupId });
      continue;
    }
    if (candidate.teacherId && slot.teacherId && candidate.teacherId === slot.teacherId) {
      conflicts.push({ kind: 'TEACHER', scheduleId: slot.id, groupId: slot.groupId });
    }
    if (candidate.roomId && slot.roomId && candidate.roomId === slot.roomId) {
      conflicts.push({ kind: 'ROOM', scheduleId: slot.id, groupId: slot.groupId });
    }
  }
  return conflicts;
};

export const isValidTimeRange = (startTime: string, endTime: string): boolean => startTime < endTime;
