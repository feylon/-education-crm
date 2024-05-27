import { hasRequiredAccess } from './permissions.guard';

describe('hasRequiredAccess', () => {
  const manager = { roles: ['MANAGER'], permissions: ['students.read', 'students.create'] };

  it('grants when every required permission is present', () => {
    expect(hasRequiredAccess(manager, ['students.read'], [])).toBe(true);
    expect(hasRequiredAccess(manager, ['students.read', 'students.create'], [])).toBe(true);
  });

  it('denies a missing permission', () => {
    expect(hasRequiredAccess(manager, ['students.delete'], [])).toBe(false);
  });

  it('lets SUPER_ADMIN bypass permission checks', () => {
    expect(hasRequiredAccess({ roles: ['SUPER_ADMIN'], permissions: [] }, ['anything.here'], ['TEACHER'])).toBe(true);
  });

  it('checks required roles in addition to permissions', () => {
    expect(hasRequiredAccess(manager, [], ['TEACHER'])).toBe(false);
    expect(hasRequiredAccess(manager, [], ['MANAGER', 'ADMIN'])).toBe(true);
  });

  it('denies anonymous users', () => {
    expect(hasRequiredAccess(undefined, ['students.read'], [])).toBe(false);
  });
});
