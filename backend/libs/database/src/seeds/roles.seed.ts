import { DEFAULT_ROLES, PERMISSION_CATALOG } from '@app/common/constants';
import { RoleName } from '@app/common/enums';
import * as bcrypt from 'bcryptjs';
import { DataSource, In } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { Seeder } from './seed.types';

export const rolesSeed: Seeder = {
  name: 'roles-and-permissions',
  async run(dataSource: DataSource): Promise<void> {
    const permissionRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);
    const existingCodes = new Set((await permissionRepo.find({ select: { code: true } })).map((permission) => permission.code));
    const addedCodes: string[] = [];

    for (const definition of PERMISSION_CATALOG) {
      if (!existingCodes.has(definition.code)) {
        await permissionRepo.save(permissionRepo.create(definition));
        addedCodes.push(definition.code);
      }
    }

    for (const definition of DEFAULT_ROLES) {
      const existing = await roleRepo.findOne({ where: { name: definition.name } });
      if (!existing) {
        const permissions = await permissionRepo.find({ where: { code: In(definition.permissions) } });
        await roleRepo.save(
          roleRepo.create({ name: definition.name, description: definition.description, isSystem: true, permissions }),
        );
        continue;
      }
      if (definition.name === RoleName.SUPER_ADMIN && addedCodes.length > 0) {
        const added = await permissionRepo.find({ where: { code: In(addedCodes) } });
        existing.permissions = [...existing.permissions, ...added.filter((permission) => !existing.permissions.some((own) => own.id === permission.id))];
        await roleRepo.save(existing);
      }
    }

    await bootstrapAdmin(dataSource);
  },
};

const bootstrapAdmin = async (dataSource: DataSource): Promise<void> => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    return;
  }
  const users = dataSource.getRepository(User);
  if (await users.exist({ where: { email } })) {
    return;
  }
  const role = await dataSource.getRepository(Role).findOneOrFail({ where: { name: RoleName.SUPER_ADMIN } });
  await users.save(
    users.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      roles: [role],
    }),
  );
};
