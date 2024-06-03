import { AuditPublisher } from '@app/common/audit';
import { CreateRoleDto, UpdateRoleDto } from '@app/common/dto';
import { AuditAction, RoleName } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { translateDatabaseError } from '@app/common/utils';
import { Permission, Role } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    private readonly audit: AuditPublisher,
  ) {}

  async findAll(): Promise<Array<Role & { usersCount: number }>> {
    const roles = await this.roles
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .loadRelationCountAndMap('role.usersCount', 'role.users')
      .orderBy('role.isSystem', 'DESC')
      .addOrderBy('role.name', 'ASC')
      .getMany();
    return roles as Array<Role & { usersCount: number }>;
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) {
      throw new RpcNotFoundException('Role not found');
    }
    return role;
  }

  async findPermissions(): Promise<Permission[]> {
    return this.permissions.find({ order: { module: 'ASC', code: 'ASC' } });
  }

  async create(dto: CreateRoleDto, meta: RequestMeta): Promise<Role> {
    const permissions = await this.resolvePermissions(dto.permissions);
    const role = await this.roles
      .save(this.roles.create({ name: dto.name, description: dto.description ?? null, isSystem: false, permissions }))
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Role', role.id, null, this.snapshot(role));
    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto, meta: RequestMeta): Promise<Role> {
    const role = await this.findOne(id);
    const before = this.snapshot(role);
    if (dto.name && dto.name !== role.name) {
      if (role.isSystem) {
        throw new RpcBadRequestException('System roles cannot be renamed');
      }
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description ?? null;
    }
    if (dto.permissions) {
      if (role.name === RoleName.SUPER_ADMIN) {
        throw new RpcBadRequestException('SUPER_ADMIN permissions cannot be changed');
      }
      role.permissions = await this.resolvePermissions(dto.permissions);
    }
    const saved = await this.roles.save(role).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Role', id, before, this.snapshot(saved));
    return this.findOne(id);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new RpcBadRequestException('System roles cannot be deleted');
    }
    const usersCount = await this.roles
      .createQueryBuilder('role')
      .innerJoin('role.users', 'user')
      .where('role.id = :id', { id })
      .getCount();
    if (usersCount > 0) {
      throw new RpcBadRequestException('Role is assigned to users and cannot be deleted');
    }
    await this.roles.remove(role);
    this.audit.publish(meta, AuditAction.DELETE, 'Role', id, this.snapshot(role), null);
    return { deleted: true };
  }

  private async resolvePermissions(codes: string[]): Promise<Permission[]> {
    const unique = [...new Set(codes)];
    const permissions = unique.length ? await this.permissions.find({ where: { code: In(unique) } }) : [];
    if (permissions.length !== unique.length) {
      const known = new Set(permissions.map((permission) => permission.code));
      const missing = unique.filter((code) => !known.has(code));
      throw new RpcBadRequestException('Unknown permission codes', missing);
    }
    return permissions;
  }

  private snapshot(role: Role): Record<string, unknown> {
    return {
      name: role.name,
      description: role.description,
      permissions: (role.permissions ?? []).map((permission) => permission.code).sort(),
    };
  }
}
