import { detectConflicts, isValidTimeRange, ScheduleSlotLike, slotsCollide } from './schedule.util';

const slot = (overrides: Partial<ScheduleSlotLike>): ScheduleSlotLike => ({
  id: 'existing',
  groupId: 'g1',
  roomId: 'r1',
  teacherId: 't1',
  weekday: 1,
  startTime: '10:00',
  endTime: '12:00',
  effectiveFrom: '2024-05-01',
  effectiveTo: null,
  ...overrides,
});

describe('slotsCollide', () => {
  it('detects overlapping time on the same weekday', () => {
    expect(slotsCollide(slot({ id: 'new', startTime: '11:00', endTime: '13:00' }), slot({}))).toBe(true);
  });

  it('allows adjacent slots and different weekdays', () => {
    expect(slotsCollide(slot({ id: 'new', startTime: '12:00', endTime: '14:00' }), slot({}))).toBe(false);
    expect(slotsCollide(slot({ id: 'new', weekday: 2 }), slot({}))).toBe(false);
  });

  it('ignores slots whose date ranges do not meet', () => {
    expect(
      slotsCollide(slot({ id: 'new', effectiveFrom: '2024-09-01' }), slot({ effectiveTo: '2024-08-31' })),
    ).toBe(false);
  });

  it('never collides with itself', () => {
    expect(slotsCollide(slot({}), slot({}))).toBe(false);
  });
});

describe('detectConflicts', () => {
  it('reports teacher and room conflicts separately', () => {
    const candidate = slot({ id: undefined, groupId: 'g2' });
    const conflicts = detectConflicts(candidate, [slot({})]);
    expect(conflicts.map((conflict) => conflict.kind).sort()).toEqual(['ROOM', 'TEACHER']);
  });

  it('reports a group conflict when the same group is double booked', () => {
    const candidate = slot({ id: undefined, roomId: 'r2', teacherId: 't2' });
    expect(detectConflicts(candidate, [slot({})])).toEqual([{ kind: 'GROUP', scheduleId: 'existing', groupId: 'g1' }]);
  });

  it('returns no conflicts for a free teacher and room', () => {
    const candidate = slot({ id: undefined, groupId: 'g2', roomId: 'r2', teacherId: 't2' });
    expect(detectConflicts(candidate, [slot({})])).toEqual([]);
  });
});

describe('isValidTimeRange', () => {
  it('requires the end to be after the start', () => {
    expect(isValidTimeRange('09:00', '10:30')).toBe(true);
    expect(isValidTimeRange('10:30', '10:30')).toBe(false);
  });
});
