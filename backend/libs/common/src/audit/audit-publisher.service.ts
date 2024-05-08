import { Injectable } from '@nestjs/common';
import { EVENTS } from '../constants';
import { AuditEventPayload, RequestMeta } from '../interfaces';
import { RpcClientService } from '../rpc/rpc-client.service';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'tokenHash', 'refreshToken', 'accessToken'];

export const stripSensitive = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitive(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(key)) {
        continue;
      }
      result[key] = stripSensitive(entry);
    }
    return result as T;
  }
  return value;
};

@Injectable()
export class AuditPublisher {
  constructor(private readonly rpc: RpcClientService) {}

  publish(
    meta: RequestMeta | undefined,
    action: string,
    entity: string,
    entityId?: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
  ): void {
    const payload: AuditEventPayload = {
      userId: meta?.userId,
      userEmail: meta?.email,
      action,
      entity,
      entityId,
      oldValue: oldValue ? stripSensitive(oldValue) : null,
      newValue: newValue ? stripSensitive(newValue) : null,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    };
    this.rpc.emit(EVENTS.AUDIT_LOG, payload);
  }
}
