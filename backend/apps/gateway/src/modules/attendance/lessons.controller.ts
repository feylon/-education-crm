import { ATTENDANCE_PATTERNS } from '@app/common/constants';
import { CreateLessonDto, GenerateLessonsDto, LessonQueryDto, MarkAttendanceDto, UpdateLessonDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { LessonResponseDto } from './attendance.response';

@ApiTags('Lessons')
@ApiBearerAuth()
@Controller('lessons')
export class LessonsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('lessons.read')
  @ApiOperation({ summary: 'List lessons' })
  @ApiPaginatedEnvelope(LessonResponseDto)
  findAll(@Query() query: LessonQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSONS_FIND_ALL, { meta, data: query });
  }

  @Get(':id')
  @RequirePermissions('lessons.read')
  @ApiOperation({ summary: 'Get a lesson' })
  @ApiOkEnvelope(LessonResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSONS_FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('lessons.create')
  @ApiOperation({ summary: 'Create a lesson manually' })
  @ApiOkEnvelope(LessonResponseDto)
  create(@Body() dto: CreateLessonDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSONS_CREATE, { meta, data: dto });
  }

  @Post('generate')
  @RequirePermissions('lessons.create')
  @ApiOperation({ summary: 'Generate lessons from schedule slots for a date range' })
  @ApiOkEnvelope()
  generate(@Body() dto: GenerateLessonsDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSONS_GENERATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('lessons.update')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiOkEnvelope(LessonResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLessonDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSONS_UPDATE, { meta, data: { id, dto } });
  }

  @Get(':id/attendance')
  @RequirePermissions('attendance.read')
  @ApiOperation({ summary: 'Attendance sheet for a lesson' })
  @ApiOkEnvelope()
  sheet(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.LESSON_SHEET, { meta, data: { lessonId: id } });
  }

  @Put(':id/attendance')
  @RequirePermissions('attendance.mark')
  @ApiOperation({ summary: 'Mark attendance for a lesson (bulk upsert)' })
  @ApiOkEnvelope()
  mark(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkAttendanceDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(ATTENDANCE_PATTERNS.MARK, { meta, data: { lessonId: id, dto } });
  }
}
