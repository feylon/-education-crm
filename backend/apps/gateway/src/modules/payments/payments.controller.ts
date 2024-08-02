import { PAYMENT_PATTERNS } from '@app/common/constants';
import { CreatePaymentDto, DebtorsQueryDto, PaymentQueryDto, RefundPaymentDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { DebtorResponseDto, PaymentResponseDto } from './payments.response';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Payment history with filters' })
  @ApiPaginatedEnvelope(PaymentResponseDto)
  findAll(@Query() query: PaymentQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('debtors')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Students with outstanding debt' })
  @ApiPaginatedEnvelope(DebtorResponseDto)
  debtors(@Query() query: DebtorsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.DEBTORS, { meta, data: query });
  }

  @Get('students/:studentId/summary')
  @ApiOperation({ summary: 'Student finance summary: paid, invoiced, balance, debt' })
  @ApiOkEnvelope()
  studentSummary(@Param('studentId', ParseUUIDPipe) studentId: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.STUDENT_SUMMARY, { meta, data: { studentId } });
  }

  @Get('students/:studentId/history')
  @ApiOperation({ summary: 'Payment history of a student' })
  @ApiPaginatedEnvelope(PaymentResponseDto)
  studentHistory(@Param('studentId', ParseUUIDPipe) studentId: string, @Query() query: PaymentQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.STUDENT_HISTORY, { meta, data: { studentId, query } });
  }

  @Get('groups/:groupId/summary')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Group finance summary' })
  @ApiOkEnvelope()
  groupSummary(@Param('groupId', ParseUUIDPipe) groupId: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.GROUP_SUMMARY, { meta, data: { groupId } });
  }

  @Get(':id')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get a payment with allocations' })
  @ApiOkEnvelope(PaymentResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('payments.create')
  @ApiOperation({ summary: 'Record a payment; allocated to an invoice or FIFO to oldest unpaid invoices' })
  @ApiOkEnvelope(PaymentResponseDto)
  create(@Body() dto: CreatePaymentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.CREATE, { meta, data: dto });
  }

  @Post(':id/refund')
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Refund a payment and roll back its allocations' })
  @ApiOkEnvelope(PaymentResponseDto)
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundPaymentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.REFUND, { meta, data: { id, dto } });
  }

  @Post(':id/cancel')
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Cancel a mistakenly recorded payment' })
  @ApiOkEnvelope(PaymentResponseDto)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundPaymentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(PAYMENT_PATTERNS.CANCEL, { meta, data: { id, dto } });
  }
}
