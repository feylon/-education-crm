import { STUDENT_PATTERNS } from '@app/common/constants';
import { CreateStudentDto, LookupQueryDto, ParentDto, StudentQueryDto, UpdateParentDto, UpdateStudentDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { StudentResponseDto } from './students.response';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'List students with search, filters and pagination' })
  @ApiPaginatedEnvelope(StudentResponseDto)
  findAll(@Query() query: StudentQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('lookup')
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'Lightweight student search for select boxes' })
  @ApiOkEnvelope()
  lookup(@Query() query: LookupQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.LOOKUP, { meta, data: query });
  }

  @Get('me')
  @ApiOperation({ summary: 'Profile of the logged in student' })
  @ApiOkEnvelope()
  me(@Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.ME, { meta, data: {} });
  }

  @Get(':id')
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'Get a student' })
  @ApiOkEnvelope(StudentResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Get(':id/profile')
  @RequirePermissions('students.read')
  @ApiOperation({ summary: 'Full profile: enrollments, attendance, finance' })
  @ApiOkEnvelope()
  profile(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.PROFILE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('students.create')
  @ApiOperation({ summary: 'Create a student' })
  @ApiOkEnvelope(StudentResponseDto)
  create(@Body() dto: CreateStudentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Update a student' })
  @ApiOkEnvelope(StudentResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStudentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('students.delete')
  @ApiOperation({ summary: 'Delete a student' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.REMOVE, { meta, data: { id } });
  }

  @Post(':id/parents')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Add a parent or guardian' })
  @ApiOkEnvelope()
  addParent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ParentDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.PARENTS_ADD, { meta, data: { studentId: id, dto } });
  }

  @Patch(':id/parents/:parentId')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Update a parent' })
  @ApiOkEnvelope()
  updateParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('parentId', ParseUUIDPipe) parentId: string,
    @Body() dto: UpdateParentDto,
    @Meta() meta: RequestMeta,
  ) {
    return this.rpc.send(STUDENT_PATTERNS.PARENTS_UPDATE, { meta, data: { studentId: id, parentId, dto } });
  }

  @Delete(':id/parents/:parentId')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'Remove a parent' })
  @ApiOkEnvelope()
  removeParent(@Param('id', ParseUUIDPipe) id: string, @Param('parentId', ParseUUIDPipe) parentId: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(STUDENT_PATTERNS.PARENTS_REMOVE, { meta, data: { studentId: id, parentId } });
  }
}
