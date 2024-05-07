import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { RpcErrorPayload } from '../interfaces';

export class RpcHttpException extends RpcException {
  constructor(statusCode: number, message: string, errors?: string[]) {
    const payload: RpcErrorPayload = { statusCode, message, errors };
    super(payload);
  }
}

export class RpcNotFoundException extends RpcHttpException {
  constructor(message = 'Resource not found') {
    super(HttpStatus.NOT_FOUND, message);
  }
}

export class RpcBadRequestException extends RpcHttpException {
  constructor(message = 'Bad request', errors?: string[]) {
    super(HttpStatus.BAD_REQUEST, message, errors);
  }
}

export class RpcConflictException extends RpcHttpException {
  constructor(message = 'Conflict') {
    super(HttpStatus.CONFLICT, message);
  }
}

export class RpcUnauthorizedException extends RpcHttpException {
  constructor(message = 'Unauthorized') {
    super(HttpStatus.UNAUTHORIZED, message);
  }
}

export class RpcForbiddenException extends RpcHttpException {
  constructor(message = 'Forbidden') {
    super(HttpStatus.FORBIDDEN, message);
  }
}

export class RpcUnprocessableException extends RpcHttpException {
  constructor(message = 'Unprocessable entity', errors?: string[]) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, message, errors);
  }
}

export const isRpcErrorPayload = (value: unknown): value is RpcErrorPayload =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RpcErrorPayload).statusCode === 'number' &&
  typeof (value as RpcErrorPayload).message === 'string';
