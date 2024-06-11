import { COURSE_PATTERNS } from '@app/common/constants';
import {
  CourseQueryDto,
  CreateCourseCategoryDto,
  CreateCourseDto,
  UpdateCourseCategoryDto,
  UpdateCourseDto,
} from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CategoriesService } from './categories.service';
import { CoursesService } from './courses.service';

@Controller()
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly categories: CategoriesService,
  ) {}

  @MessagePattern(COURSE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<CourseQueryDto>) {
    return this.courses.findAll(payload.data);
  }

  @MessagePattern(COURSE_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.courses.findOne(payload.data.id);
  }

  @MessagePattern(COURSE_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateCourseDto>) {
    return this.courses.create(payload.data, payload.meta);
  }

  @MessagePattern(COURSE_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateCourseDto }>) {
    return this.courses.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(COURSE_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.courses.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(COURSE_PATTERNS.CATEGORIES_FIND_ALL)
  findCategories() {
    return this.categories.findAll();
  }

  @MessagePattern(COURSE_PATTERNS.CATEGORIES_CREATE)
  createCategory(@Payload() payload: WithMeta<CreateCourseCategoryDto>) {
    return this.categories.create(payload.data, payload.meta);
  }

  @MessagePattern(COURSE_PATTERNS.CATEGORIES_UPDATE)
  updateCategory(@Payload() payload: WithMeta<{ id: string; dto: UpdateCourseCategoryDto }>) {
    return this.categories.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(COURSE_PATTERNS.CATEGORIES_REMOVE)
  removeCategory(@Payload() payload: WithMeta<{ id: string }>) {
    return this.categories.remove(payload.data.id, payload.meta);
  }
}
