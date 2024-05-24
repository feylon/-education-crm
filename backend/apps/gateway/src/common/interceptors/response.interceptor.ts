import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { map, Observable } from 'rxjs';

export interface SuccessEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T> | T> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => {
        if (response.getHeader('x-raw-response')) {
          response.removeHeader('x-raw-response');
          return data;
        }
        return { success: true as const, statusCode: response.statusCode, data };
      }),
    );
  }
}
