import { RoleName } from '@app/common/enums';
import { JwtPayload } from '@app/common/interfaces';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const hasRequiredAccess = (
  user: Pick<JwtPayload, 'roles' | 'permissions'> | undefined,
  requiredPermissions: string[],
  requiredRoles: string[],
): boolean => {
  if (!user) {
    return false;
  }
  if (user.roles.includes(RoleName.SUPER_ADMIN)) {
    return true;
  }
  if (requiredRoles.length > 0 && !requiredRoles.some((role) => user.roles.includes(role))) {
    return false;
  }
  return requiredPermissions.every((permission) => user.permissions.includes(permission));
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets) ?? [];
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets) ?? [];
    if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!hasRequiredAccess(request.user, requiredPermissions, requiredRoles)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
