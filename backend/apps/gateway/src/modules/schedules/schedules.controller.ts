import { SCHEDULE_PATTERNS } from '@app/common/constants';
import { CalendarQueryDto, CheckConflictsDto, CreateScheduleDto, ScheduleQueryDto, UpdateScheduleDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { ScheduleResponseDto } from './schedules.response';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('schedules.read')
  @ApiOperation({ summary: 'List weekly schedule slots' })
  @ApiPaginatedEnvelope(ScheduleResponseDto)
  findAll(@Query() query: ScheduleQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('calendar')
  @RequirePermissions('schedules.read')
  @ApiOperation({ summary: 'Calendar view: lessons and slots expanded for a date range (default current week)' })
  @ApiOkEnvelope()
  calendar(@Query() query: CalendarQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.CALENDAR, { meta, data: query });
  }

  @Post('check-conflicts')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('schedules.read')
  @ApiOperation({ summary: 'Check teacher and room conflicts for a candidate slot' })
  @ApiOkEnvelope()
  checkConflicts(@Body() dto: CheckConflictsDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.CHECK_CONFLICTS, { meta, data: dto });
  }

  @Get(':id')
  @RequirePermissions('schedules.read')
  @ApiOperation({ summary: 'Get a schedule slot' })
  @ApiOkEnvelope(ScheduleResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('schedules.create')
  @ApiOperation({ summary: 'Create a slot (rejected with 409 on conflicts)' })
  @ApiOkEnvelope(ScheduleResponseDto)
  create(@Body() dto: CreateScheduleDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('schedules.update')
  @ApiOperation({ summary: 'Update a slot' })
  @ApiOkEnvelope(ScheduleResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScheduleDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('schedules.delete')
  @ApiOperation({ summary: 'Delete a slot' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(SCHEDULE_PATTERNS.REMOVE, { meta, data: { id } });
  }
}
