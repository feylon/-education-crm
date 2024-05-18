import { DEFAULT_ROLES, PERMISSION_CATALOG } from '@app/common/constants';
import { DataSource, In } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { Seeder } from './seed.types';

export const rolesSeed: Seeder = {
  name: 'roles-and-permissions',
  async run(dataSource: DataSource): Promise<void> {
    const permissionRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);

    for (const definition of PERMISSION_CATALOG) {
      const existing = await permissionRepo.findOne({ where: { code: definition.code } });
      if (existing) {
        existing.module = definition.module;
        existing.description = definition.description;
        await permissionRepo.save(existing);
      } else {
        await permissionRepo.save(permissionRepo.create(definition));
      }
    }

    for (const definition of DEFAULT_ROLES) {
      const permissions = await permissionRepo.find({ where: { code: In(definition.permissions) } });
      const existing = await roleRepo.findOne({ where: { name: definition.name } });
      if (existing) {
        existing.permissions = permissions;
        existing.description = definition.description;
        existing.isSystem = true;
        await roleRepo.save(existing);
      } else {
        await roleRepo.save(
          roleRepo.create({ name: definition.name, description: definition.description, isSystem: true, permissions }),
        );
      }
    }
  },
};
