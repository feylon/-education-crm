import { AuditPublisher } from '@app/common/audit';
import { CreateCourseCategoryDto, UpdateCourseCategoryDto } from '@app/common/dto';
import { AuditAction } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { translateDatabaseError } from '@app/common/utils';
import { Course, CourseCategory } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CourseCategory) private readonly categories: Repository<CourseCategory>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    private readonly audit: AuditPublisher,
  ) {}

  findAll(): Promise<CourseCategory[]> {
    return this.categories
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.coursesCount', 'category.courses')
      .orderBy('category.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<CourseCategory> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new RpcNotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCourseCategoryDto, meta: RequestMeta): Promise<CourseCategory> {
    const category = await this.categories
      .save(this.categories.create({ name: dto.name, description: dto.description ?? null }))
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'CourseCategory', category.id, null, { ...dto });
    return category;
  }

  async update(id: string, dto: UpdateCourseCategoryDto, meta: RequestMeta): Promise<CourseCategory> {
    const category = await this.findOne(id);
    const before = { name: category.name, description: category.description };
    Object.assign(category, { name: dto.name ?? category.name, description: dto.description ?? category.description });
    const saved = await this.categories.save(category).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'CourseCategory', id, before, { name: saved.name, description: saved.description });
    return saved;
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const category = await this.findOne(id);
    const inUse = await this.courses.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new RpcBadRequestException('Category has courses and cannot be deleted');
    }
    await this.categories.softRemove(category);
    this.audit.publish(meta, AuditAction.DELETE, 'CourseCategory', id, { name: category.name }, null);
    return { deleted: true };
  }
}
