import { PAYMENT_PATTERNS } from '@app/common/constants';
import { CreateInvoiceDto, GenerateInvoicesDto, InvoiceQueryDto, UpdateInvoiceDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { InvoiceResponseDto } from './payments.response';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('invoices.read')
  @ApiOperation({ summary: 'List invoices' })
  @ApiPaginatedEnvelope(InvoiceResponseDto)
  findAll(@Query() query: InvoiceQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_FIND_ALL, { meta, data: query });
  }

  @Get(':id')
  @RequirePermissions('invoices.read')
  @ApiOperation({ summary: 'Get an invoice with allocations' })
  @ApiOkEnvelope(InvoiceResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('invoices.create')
  @ApiOperation({ summary: 'Create a manual invoice' })
  @ApiOkEnvelope(InvoiceResponseDto)
  create(@Body() dto: CreateInvoiceDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_CREATE, { meta, data: dto });
  }

  @Post('generate')
  @RequirePermissions('invoices.create')
  @ApiOperation({ summary: 'Generate monthly invoices for active enrollments' })
  @ApiOkEnvelope()
  generate(@Body() dto: GenerateInvoicesDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_GENERATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('invoices.update')
  @ApiOperation({ summary: 'Update amount, due date or description' })
  @ApiOkEnvelope(InvoiceResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_UPDATE, { meta, data: { id, dto } });
  }

  @Post(':id/cancel')
  @RequirePermissions('invoices.update')
  @ApiOperation({ summary: 'Cancel an unpaid invoice' })
  @ApiOkEnvelope(InvoiceResponseDto)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.INVOICES_CANCEL, { meta, data: { id } });
  }
}
