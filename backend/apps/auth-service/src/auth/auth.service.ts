import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { AuthUserView, ChangePasswordDto, LoginDto, LoginResult, TokenPair } from '@app/common/dto';
import { AuditAction, RoleName } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcNotFoundException, RpcUnauthorizedException } from '@app/common/rpc';
import { RefreshToken, Student, Teacher, User } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository } from 'typeorm';
import { TokenService } from './token.service';

export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly tokens: TokenService,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async login(dto: LoginDto, client: ClientInfo): Promise<LoginResult> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new RpcUnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new RpcUnauthorizedException('Account is deactivated');
    }
    const pair = await this.issueTokens(user, client);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    const meta: RequestMeta = {
      userId: user.id,
      email: user.email,
      roles: this.roleNames(user),
      permissions: this.permissionCodes(user),
      ip: client.ip,
      userAgent: client.userAgent,
    };
    this.audit.publish(meta, AuditAction.LOGIN, 'User', user.id);
    this.rpc.emit(EVENTS.USER_LOGGED_IN, { userId: user.id, at: new Date().toISOString() });
    return { ...pair, user: await this.toView(user) };
  }

  async refresh(refreshToken: string, client: ClientInfo): Promise<TokenPair> {
    const payload = this.tokens.verifyRefresh(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash: this.tokens.hash(refreshToken) } });
    if (!stored || stored.expiresAt.getTime() < Date.now() || stored.userId !== payload.sub) {
      throw new RpcUnauthorizedException('Refresh token is no longer valid');
    }
    if (stored.revokedAt) {
      await this.refreshTokens.update({ userId: stored.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
      throw new RpcUnauthorizedException('Refresh token reuse detected, all sessions were revoked');
    }
    const rotated = await this.refreshTokens.update({ id: stored.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    if (!rotated.affected) {
      throw new RpcUnauthorizedException('Refresh token is no longer valid');
    }
    const user = await this.findActiveUser(payload.sub);
    return this.issueTokens(user, client);
  }

  async logout(refreshToken: string | undefined, meta: RequestMeta): Promise<{ loggedOut: boolean }> {
    if (refreshToken) {
      await this.refreshTokens.update(
        { tokenHash: this.tokens.hash(refreshToken), userId: meta.userId },
        { revokedAt: new Date() },
      );
    } else {
      await this.refreshTokens.update({ userId: meta.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    }
    this.audit.publish(meta, AuditAction.LOGOUT, 'User', meta.userId);
    return { loggedOut: true };
  }

  async me(userId: string): Promise<AuthUserView> {
    const user = await this.findActiveUser(userId);
    return this.toView(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, meta: RequestMeta): Promise<{ changed: boolean }> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new RpcNotFoundException('User not found');
    }
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new RpcBadRequestException('Current password is incorrect');
    }
    await this.users.update(userId, { passwordHash: await bcrypt.hash(dto.newPassword, 10) });
    await this.refreshTokens.update({ userId }, { revokedAt: new Date() });
    this.audit.publish(meta, AuditAction.UPDATE, 'UserPassword', userId);
    return { changed: true };
  }

  private async issueTokens(user: User, client: ClientInfo): Promise<TokenPair> {
    const signed = this.tokens.sign({
      sub: user.id,
      email: user.email,
      roles: this.roleNames(user),
      permissions: this.permissionCodes(user),
    });
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: this.tokens.hash(signed.refreshToken),
        expiresAt: signed.refreshExpiresAt,
        userAgent: client.userAgent?.slice(0, 500) ?? null,
        ip: client.ip ?? null,
      }),
    );
    return { accessToken: signed.accessToken, refreshToken: signed.refreshToken, expiresIn: signed.expiresIn };
  }

  private async findActiveUser(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id }, relations: { roles: { permissions: true } } });
    if (!user || !user.isActive) {
      throw new RpcUnauthorizedException('Account is not available');
    }
    return user;
  }

  private roleNames(user: User): string[] {
    return (user.roles ?? []).map((role) => role.name);
  }

  private permissionCodes(user: User): string[] {
    const codes = new Set<string>();
    for (const role of user.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        codes.add(permission.code);
      }
    }
    return [...codes].sort();
  }

  private async toView(user: User): Promise<AuthUserView> {
    const roles = this.roleNames(user);
    const [teacher, student] = await Promise.all([
      roles.includes(RoleName.TEACHER) ? this.teachers.findOne({ where: { userId: user.id } }) : null,
      roles.includes(RoleName.STUDENT) ? this.students.findOne({ where: { userId: user.id } }) : null,
    ]);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles,
      permissions: this.permissionCodes(user),
      teacherId: teacher?.id ?? null,
      studentId: student?.id ?? null,
    };
  }
}
