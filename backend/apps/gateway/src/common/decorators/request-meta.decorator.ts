import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { buildRequestMeta } from '../utils/request-meta.util';

export const Meta = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  buildRequestMeta(context.switchToHttp().getRequest<Request>()),
);
