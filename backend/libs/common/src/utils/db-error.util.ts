import { QueryFailedError } from 'typeorm';
import { RpcConflictException, RpcBadRequestException } from '../rpc/rpc.exceptions';

interface PgError {
  code?: string;
  detail?: string;
}

export const translateDatabaseError = (error: unknown): never => {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as PgError;
    if (driverError?.code === '23505') {
      throw new RpcConflictException('A record with the same unique value already exists');
    }
    if (driverError?.code === '23503') {
      throw new RpcBadRequestException('Referenced record does not exist or is still in use');
    }
  }
  throw error;
};
