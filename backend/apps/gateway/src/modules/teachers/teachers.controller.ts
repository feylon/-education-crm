import { TEACHER_PATTERNS } from '@app/common/constants';
import { CreateTeacherDto, LookupQueryDto, TeacherQueryDto, UpdateTeacherDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { TeacherResponseDto } from './teachers.response';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('teachers.read')
  @ApiOperation({ summary: 'List teachers' })
  @ApiPaginatedEnvelope(TeacherResponseDto)
  findAll(@Query() query: TeacherQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('lookup')
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'Lightweight teacher search for select boxes' })
  @ApiOkEnvelope()
  lookup(@Query() query: LookupQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.LOOKUP, { meta, data: query });
  }

  @Get('me')
  @ApiOperation({ summary: 'Dashboard of the logged in teacher' })
  @ApiOkEnvelope()
  me(@Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.ME, { meta, data: {} });
  }

  @Get(':id')
  @RequirePermissions('teachers.read')
  @ApiOperation({ summary: 'Get a teacher' })
  @ApiOkEnvelope(TeacherResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Get(':id/profile')
  @RequirePermissions('teachers.read')
  @ApiOperation({ summary: 'Teacher profile: groups, schedule, statistics' })
  @ApiOkEnvelope()
  profile(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.PROFILE, { meta, data: { id } });
  }

  @Get(':id/dashboard')
  @RequirePermissions('teachers.read')
  @ApiOperation({ summary: 'Teacher dashboard data (lessons today, upcoming, unmarked)' })
  @ApiOkEnvelope()
  dashboard(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.DASHBOARD, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('teachers.create')
  @ApiOperation({ summary: 'Create a teacher together with a login account' })
  @ApiOkEnvelope(TeacherResponseDto)
  create(@Body() dto: CreateTeacherDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('teachers.update')
  @ApiOperation({ summary: 'Update a teacher' })
  @ApiOkEnvelope(TeacherResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('teachers.delete')
  @ApiOperation({ summary: 'Delete a teacher' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(TEACHER_PATTERNS.REMOVE, { meta, data: { id } });
  }
}
