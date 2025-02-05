import { RpcForbiddenException } from '@app/common/rpc';
import { UsersService } from './users.service';

const superAdminUser = { id: 'sa', email: 'superadmin@crm.local', firstName: 'S', lastName: 'A', phone: null, isActive: true, roles: [{ id: 'r1', name: 'SUPER_ADMIN' }] };
const metaFor = (roles: string[]) => ({ userId: 'actor', email: 'actor@crm.local', roles, permissions: [] });

describe('UsersService super admin protection', () => {
  const users = {
    findOne: jest.fn().mockResolvedValue(superAdminUser),
    save: jest.fn(),
    softRemove: jest.fn(),
    update: jest.fn(),
  };
  const roles = { find: jest.fn().mockResolvedValue([]) };
  const refreshTokens = { update: jest.fn() };
  const audit = { publish: jest.fn() };
  const service = new UsersService(users as never, roles as never, refreshTokens as never, audit as never);

  it('refuses an ADMIN updating a SUPER_ADMIN account', async () => {
    await expect(service.update('sa', { password: 'NewPassword123' }, metaFor(['ADMIN']))).rejects.toBeInstanceOf(RpcForbiddenException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('refuses an ADMIN deleting a SUPER_ADMIN account', async () => {
    await expect(service.remove('sa', metaFor(['ADMIN']))).rejects.toBeInstanceOf(RpcForbiddenException);
    expect(users.softRemove).not.toHaveBeenCalled();
  });

  it('lets a SUPER_ADMIN delete another SUPER_ADMIN and revokes its sessions', async () => {
    await expect(service.remove('sa', metaFor(['SUPER_ADMIN']))).resolves.toEqual({ deleted: true });
    expect(refreshTokens.update).toHaveBeenCalledWith({ userId: 'sa' }, expect.objectContaining({ revokedAt: expect.any(Date) }));
  });
});
