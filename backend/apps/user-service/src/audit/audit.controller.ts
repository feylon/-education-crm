import { EVENTS, USER_PATTERNS } from '@app/common/constants';
import { AuditQueryDto } from '@app/common/dto';
import { AuditEventPayload, WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { AuditService } from './audit.service';

@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @EventPattern(EVENTS.AUDIT_LOG)
  record(@Payload() payload: AuditEventPayload) {
    return this.audit.record(payload);
  }

  @MessagePattern(USER_PATTERNS.AUDIT_FIND_ALL)
  findAll(@Payload() payload: WithMeta<AuditQueryDto>) {
    return this.audit.findAll(payload.data);
  }
}
