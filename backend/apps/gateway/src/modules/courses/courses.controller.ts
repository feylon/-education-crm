import { COURSE_PATTERNS } from '@app/common/constants';
import { CourseQueryDto, CreateCourseCategoryDto, CreateCourseDto, UpdateCourseCategoryDto, UpdateCourseDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkEnvelope, ApiPaginatedEnvelope, Meta, RequirePermissions } from '../../common';
import { CourseCategoryResponseDto, CourseResponseDto } from './courses.response';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly rpc: RpcClientService) {}

  @Get()
  @RequirePermissions('courses.read')
  @ApiOperation({ summary: 'List courses' })
  @ApiPaginatedEnvelope(CourseResponseDto)
  findAll(@Query() query: CourseQueryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.FIND_ALL, { meta, data: query });
  }

  @Get('categories')
  @RequirePermissions('courses.read')
  @ApiOperation({ summary: 'List course categories' })
  @ApiOkResponse({ type: [CourseCategoryResponseDto] })
  categories(@Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.CATEGORIES_FIND_ALL, { meta, data: {} });
  }

  @Post('categories')
  @RequirePermissions('courses.create')
  @ApiOperation({ summary: 'Create a category' })
  @ApiOkEnvelope(CourseCategoryResponseDto)
  createCategory(@Body() dto: CreateCourseCategoryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.CATEGORIES_CREATE, { meta, data: dto });
  }

  @Patch('categories/:id')
  @RequirePermissions('courses.update')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkEnvelope(CourseCategoryResponseDto)
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseCategoryDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.CATEGORIES_UPDATE, { meta, data: { id, dto } });
  }

  @Delete('categories/:id')
  @RequirePermissions('courses.delete')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkEnvelope()
  removeCategory(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.CATEGORIES_REMOVE, { meta, data: { id } });
  }

  @Get(':id')
  @RequirePermissions('courses.read')
  @ApiOperation({ summary: 'Get a course with its groups' })
  @ApiOkEnvelope(CourseResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.FIND_ONE, { meta, data: { id } });
  }

  @Post()
  @RequirePermissions('courses.create')
  @ApiOperation({ summary: 'Create a course' })
  @ApiOkEnvelope(CourseResponseDto)
  create(@Body() dto: CreateCourseDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.CREATE, { meta, data: dto });
  }

  @Patch(':id')
  @RequirePermissions('courses.update')
  @ApiOperation({ summary: 'Update a course' })
  @ApiOkEnvelope(CourseResponseDto)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.UPDATE, { meta, data: { id, dto } });
  }

  @Delete(':id')
  @RequirePermissions('courses.delete')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(COURSE_PATTERNS.REMOVE, { meta, data: { id } });
  }
}
