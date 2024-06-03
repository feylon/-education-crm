import { AuditPublisher } from '@app/common/audit';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from '@app/common/dto';
import { AuditAction, RoleName } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcForbiddenException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Role, User } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';

const SORTABLE = ['createdAt', 'email', 'firstName', 'lastName', 'lastLoginAt'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly audit: AuditPublisher,
  ) {}

  async findAll(query: UserQueryDto): Promise<Paginated<User>> {
    const qb = this.users.createQueryBuilder('user').leftJoinAndSelect('user.roles', 'role');
    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.role) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_roles ur INNER JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = user.id AND r.name = :roleName)',
        { roleName: query.role },
      );
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    applySorting(qb, 'user', query, SORTABLE);
    return paginateQuery(qb, query);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id }, relations: { roles: { permissions: true } } });
    if (!user) {
      throw new RpcNotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateUserDto, meta: RequestMeta): Promise<User> {
    const roles = await this.resolveRoles(dto.roleIds, meta);
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      isActive: dto.isActive ?? true,
      roles,
    });
    const saved = await this.users.save(user).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'User', saved.id, null, this.snapshot(saved));
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, meta: RequestMeta): Promise<User> {
    const user = await this.findOne(id);
    const before = this.snapshot(user);
    if (dto.roleIds) {
      user.roles = await this.resolveRoles(dto.roleIds, meta);
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;
    if (dto.isActive !== undefined) {
      if (id === meta.userId && dto.isActive === false) {
        throw new RpcBadRequestException('You cannot deactivate your own account');
      }
      user.isActive = dto.isActive;
    }
    const saved = await this.users.save(user).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'User', id, before, this.snapshot(saved));
    return this.findOne(id);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    if (id === meta.userId) {
      throw new RpcBadRequestException('You cannot delete your own account');
    }
    const user = await this.findOne(id);
    await this.users.softRemove(user);
    this.audit.publish(meta, AuditAction.DELETE, 'User', id, this.snapshot(user), null);
    return { deleted: true };
  }

  private async resolveRoles(roleIds: string[], meta: RequestMeta): Promise<Role[]> {
    const roles = await this.roles.find({ where: { id: In(roleIds) } });
    if (roles.length !== new Set(roleIds).size) {
      throw new RpcBadRequestException('One or more roles do not exist');
    }
    const assignsSuperAdmin = roles.some((role) => role.name === RoleName.SUPER_ADMIN);
    if (assignsSuperAdmin && !meta.roles.includes(RoleName.SUPER_ADMIN)) {
      throw new RpcForbiddenException('Only a super admin can assign the SUPER_ADMIN role');
    }
    return roles;
  }

  private snapshot(user: User): Record<string, unknown> {
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isActive: user.isActive,
      roles: (user.roles ?? []).map((role) => role.name),
    };
  }
}
