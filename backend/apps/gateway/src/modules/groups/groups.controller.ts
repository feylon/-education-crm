import { GROUP_PATTERNS } from '@app/common/constants';
import {
  CreateGroupDto,
  EnrollStudentDto,
  GroupQueryDto,
  GroupStudentsQueryDto,
  LookupQueryDto,
  UpdateEnrollmentDto,
  UpdateGroupDto,
} from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { EnrollmentResponseDto, GroupResponseDto } from './groups.response';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'List groups' })
  @ApiPaginatedEnvelope(GroupResponseDto)
  findAll(@Query() query: GroupQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('lookup')
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'Lightweight group search for select boxes' })
  @ApiOkEnvelope()
  lookup(@Query() query: LookupQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.LOOKUP, { meta, data: query });
  }

  @Get(':id')
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'Get a group with course, teacher, room and schedule' })
  @ApiOkEnvelope(GroupResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Get(':id/statistics')
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'Group statistics: students, lessons, attendance, finance' })
  @ApiOkEnvelope()
  statistics(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.STATISTICS, { meta, data: { id } });
  }

  @Get(':id/students')
  @RequirePermissions('groups.read')
  @ApiOperation({ summary: 'Students enrolled in the group' })
  @ApiPaginatedEnvelope(EnrollmentResponseDto)
  students(@Param('id', ParseUUIDPipe) id: string, @Query() query: GroupStudentsQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.STUDENTS, { meta, data: { id, query } });
  }

  @Post()
  @RequirePermissions('groups.create')
  @ApiOperation({ summary: 'Create a group' })
  @ApiOkEnvelope(GroupResponseDto)
  create(@Body() dto: CreateGroupDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('groups.update')
  @ApiOperation({ summary: 'Update a group' })
  @ApiOkEnvelope(GroupResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('groups.delete')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.REMOVE, { meta, data: { id } });
  }

  @Post(':id/students')
  @RequirePermissions('groups.enroll')
  @ApiOperation({ summary: 'Enroll a student' })
  @ApiOkEnvelope(EnrollmentResponseDto)
  enroll(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EnrollStudentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.ENROLL, { meta, data: { id, dto } });
  }

  @Patch(':id/students/:enrollmentId')
  @RequirePermissions('groups.enroll')
  @ApiOperation({ summary: 'Update an enrollment (discount, status, notes)' })
  @ApiOkEnvelope(EnrollmentResponseDto)
  updateEnrollment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @Meta() meta: RequestMeta,
  ) {
    return this.rpc.send(GROUP_PATTERNS.UPDATE_ENROLLMENT, { meta, data: { id, enrollmentId, dto } });
  }

  @Delete(':id/students/:enrollmentId')
  @RequirePermissions('groups.enroll')
  @ApiOperation({ summary: 'Remove a student from the group' })
  @ApiOkEnvelope(EnrollmentResponseDto)
  unenroll(@Param('id', ParseUUIDPipe) id: string, @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(GROUP_PATTERNS.UNENROLL, { meta, data: { id, enrollmentId } });
  }
}
