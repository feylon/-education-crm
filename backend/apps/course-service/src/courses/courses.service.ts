import { AuditPublisher } from '@app/common/audit';
import { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from '@app/common/dto';
import { AuditAction, GroupStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Course, CourseCategory, Group } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const SORTABLE = ['createdAt', 'name', 'price', 'durationMonths', 'status'];

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(CourseCategory) private readonly categories: Repository<CourseCategory>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly audit: AuditPublisher,
  ) {}

  async findAll(query: CourseQueryDto): Promise<Paginated<Course>> {
    const qb = this.courses
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .loadRelationCountAndMap('course.groupsCount', 'course.groups', 'activeGroup', (sub) =>
        sub.andWhere('activeGroup.status = :activeStatus', { activeStatus: GroupStatus.ACTIVE }),
      );
    if (query.search) {
      qb.andWhere('(course.name ILIKE :search OR course.description ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('course.status = :status', { status: query.status });
    if (query.categoryId) qb.andWhere('course.categoryId = :categoryId', { categoryId: query.categoryId });
    applySorting(qb, 'course', query, SORTABLE);
    return paginateQuery(qb, query);
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courses
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.groups', 'group')
      .leftJoinAndSelect('group.teacher', 'teacher')
      .loadRelationCountAndMap('group.studentsCount', 'group.enrollments', 'enrollment', (sub) =>
        sub.andWhere('enrollment.status = :enrolled', { enrolled: 'ACTIVE' }),
      )
      .where('course.id = :id', { id })
      .getOne();
    if (!course) {
      throw new RpcNotFoundException('Course not found');
    }
    return course;
  }

  async create(dto: CreateCourseDto, meta: RequestMeta): Promise<Course> {
    await this.assertCategory(dto.categoryId);
    const course = await this.courses
      .save(
        this.courses.create({
          name: dto.name,
          description: dto.description ?? null,
          categoryId: dto.categoryId ?? null,
          durationMonths: dto.durationMonths ?? 3,
          price: dto.price,
          status: dto.status,
          color: dto.color ?? null,
        }),
      )
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Course', course.id, null, this.snapshot(course));
    return this.findOne(course.id);
  }

  async update(id: string, dto: UpdateCourseDto, meta: RequestMeta): Promise<Course> {
    const course = await this.courses.findOneOrFail({ where: { id } }).catch(() => {
      throw new RpcNotFoundException('Course not found');
    });
    const before = this.snapshot(course);
    if (dto.categoryId !== undefined) {
      await this.assertCategory(dto.categoryId);
      course.categoryId = dto.categoryId ?? null;
    }
    if (dto.name !== undefined) course.name = dto.name;
    if (dto.description !== undefined) course.description = dto.description ?? null;
    if (dto.durationMonths !== undefined) course.durationMonths = dto.durationMonths;
    if (dto.price !== undefined) course.price = dto.price;
    if (dto.status !== undefined) course.status = dto.status;
    if (dto.color !== undefined) course.color = dto.color ?? null;
    const saved = await this.courses.save(course).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Course', id, before, this.snapshot(saved));
    return this.findOne(id);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) {
      throw new RpcNotFoundException('Course not found');
    }
    const activeGroups = await this.groups.count({ where: { courseId: id, status: GroupStatus.ACTIVE } });
    if (activeGroups > 0) {
      throw new RpcBadRequestException('Course has active groups and cannot be deleted');
    }
    await this.courses.softRemove(course);
    this.audit.publish(meta, AuditAction.DELETE, 'Course', id, this.snapshot(course), null);
    return { deleted: true };
  }

  private async assertCategory(categoryId?: string): Promise<void> {
    if (!categoryId) {
      return;
    }
    const exists = await this.categories.exist({ where: { id: categoryId } });
    if (!exists) {
      throw new RpcBadRequestException('Category does not exist');
    }
  }

  private snapshot(course: Course): Record<string, unknown> {
    return {
      name: course.name,
      categoryId: course.categoryId,
      durationMonths: course.durationMonths,
      price: course.price,
      status: course.status,
    };
  }
}
