import { USER_PATTERNS } from '@app/common/constants';
import { AuditQueryDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { AuditLogResponseDto } from './users.response';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'Browse the audit log' })
  @ApiPaginatedEnvelope(AuditLogResponseDto)
  findAll(@Query() query: AuditQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(USER_PATTERNS.AUDIT_FIND_ALL, { meta, data: query });
  }
}
