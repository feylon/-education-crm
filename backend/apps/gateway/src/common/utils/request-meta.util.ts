import { JwtPayload, RequestMeta } from '@app/common/interfaces';
import { Request } from 'express';

export const clientIp = (request: Request): string | undefined => request.ip ?? request.socket?.remoteAddress ?? undefined;

export const buildRequestMeta = (request: Request): RequestMeta => {
  const user = (request as Request & { user?: JwtPayload }).user;
  return {
    userId: user?.sub ?? '',
    email: user?.email ?? '',
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
    ip: clientIp(request),
    userAgent: request.headers['user-agent'],
  };
};
