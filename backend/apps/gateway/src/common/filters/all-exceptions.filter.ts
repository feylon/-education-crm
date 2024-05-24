import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  message: string;
  errors: string[];
  path: string;
  timestamp: string;
}

const extractMessage = (body: unknown, fallback: string): { message: string; errors: string[] } => {
  if (typeof body === 'string') {
    return { message: body, errors: [] };
  }
  if (body && typeof body === 'object') {
    const record = body as { message?: unknown; errors?: unknown; error?: unknown };
    const errors = Array.isArray(record.errors) ? record.errors.map(String) : [];
    if (Array.isArray(record.message)) {
      return { message: 'Validation failed', errors: [...errors, ...record.message.map(String)] };
    }
    if (typeof record.message === 'string') {
      return { message: record.message, errors };
    }
    if (typeof record.error === 'string') {
      return { message: record.error, errors };
    }
  }
  return { message: fallback, errors: [] };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, errors } = isHttp
      ? extractMessage(exception.getResponse(), exception.message)
      : { message: 'Internal server error', errors: [] };
    if (!isHttp) {
      this.logger.error(
        `${request.method} ${request.url} failed: ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }
    const envelope: ErrorEnvelope = {
      success: false,
      statusCode,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(envelope);
  }
}
