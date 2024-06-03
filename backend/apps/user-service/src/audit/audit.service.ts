import { AuditQueryDto } from '@app/common/dto';
import { AuditEventPayload, Paginated } from '@app/common/interfaces';
import { applySorting, paginateQuery } from '@app/common/utils';
import { AuditLog } from '@app/database';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async record(payload: AuditEventPayload): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          userId: payload.userId ?? null,
          userEmail: payload.userEmail ?? null,
          action: payload.action,
          entity: payload.entity,
          entityId: payload.entityId ?? null,
          oldValue: payload.oldValue ?? null,
          newValue: payload.newValue ?? null,
          ip: payload.ip ?? null,
          userAgent: payload.userAgent?.slice(0, 500) ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to persist audit entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findAll(query: AuditQueryDto): Promise<Paginated<AuditLog>> {
    const qb = this.logs.createQueryBuilder('log');
    if (query.userId) qb.andWhere('log.userId = :userId', { userId: query.userId });
    if (query.entity) qb.andWhere('log.entity = :entity', { entity: query.entity });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere('(log.userEmail ILIKE :search OR log.entity ILIKE :search OR CAST(log.entityId AS TEXT) ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    applySorting(qb, 'log', query, ['createdAt', 'action', 'entity']);
    return paginateQuery(qb, query);
  }
}
