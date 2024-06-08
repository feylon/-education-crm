import { HttpException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError, TimeoutError } from 'rxjs';
import { RPC_CLIENT, RPC_TIMEOUT_MS } from '../constants';
import { isRpcErrorPayload } from './rpc.exceptions';

@Injectable()
export class RpcClientService {
  private readonly logger = new Logger(RpcClientService.name);

  constructor(@Inject(RPC_CLIENT) private readonly client: ClientProxy) {}

  async send<TResult, TPayload = unknown>(pattern: string, payload: TPayload): Promise<TResult> {
    return firstValueFrom(
      this.client.send<TResult, TPayload>(pattern, payload).pipe(
        timeout(RPC_TIMEOUT_MS),
        catchError((error: unknown) => throwError(() => this.translate(pattern, error))),
      ),
    );
  }

  emit<TPayload>(event: string, payload: TPayload): void {
    this.client.emit(event, payload).subscribe({
      error: (error: unknown) => this.logger.error(`Failed to emit ${event}: ${String(error)}`),
    });
  }

  private translate(pattern: string, error: unknown): HttpException {
    if (error instanceof TimeoutError) {
      this.logger.error(`RPC timeout for pattern ${pattern}`);
      return new ServiceUnavailableException(`Service handling ${pattern} is unavailable`);
    }
    if (isRpcErrorPayload(error)) {
      return new HttpException(
        { statusCode: error.statusCode, message: error.message, errors: error.errors ?? [] },
        error.statusCode,
      );
    }
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    this.logger.error(`RPC failure for pattern ${pattern}: ${message}`);
    return new HttpException({ statusCode: 500, message: 'Internal server error' }, 500);
  }
}
