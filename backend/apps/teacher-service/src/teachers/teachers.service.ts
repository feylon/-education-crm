import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { CreateTeacherDto, LookupQueryDto, TeacherQueryDto, UpdateTeacherDto } from '@app/common/dto';
import { AuditAction, GroupStatus, RoleName, TeacherStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcForbiddenException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, isTeacherScoped, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Group, Role, Teacher, User } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

const SORTABLE = ['createdAt', 'firstName', 'lastName', 'phone', 'status', 'hireDate', 'specialization'];

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async findAll(query: TeacherQueryDto): Promise<Paginated<Teacher>> {
    const qb = this.teachers
      .createQueryBuilder('teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('teacher.branch', 'branch')
      .loadRelationCountAndMap('teacher.groupsCount', 'teacher.groups', 'activeGroup', (sub) =>
        sub.andWhere('activeGroup.status = :activeStatus', { activeStatus: GroupStatus.ACTIVE }),
      );
    if (query.search) {
      qb.andWhere(
        '(teacher.firstName ILIKE :search OR teacher.lastName ILIKE :search OR teacher.phone ILIKE :search OR user.email ILIKE :search OR teacher.specialization ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('teacher.status = :status', { status: query.status });
    if (query.branchId) qb.andWhere('teacher.branchId = :branchId', { branchId: query.branchId });
    if (query.specialization) qb.andWhere('teacher.specialization ILIKE :spec', { spec: `%${query.specialization}%` });
    applySorting(qb, 'teacher', query, SORTABLE);
    return paginateQuery(qb, query);
  }

  lookup(query: LookupQueryDto): Promise<Teacher[]> {
    const qb = this.teachers
      .createQueryBuilder('teacher')
      .where('teacher.status != :terminated', { terminated: TeacherStatus.TERMINATED })
      .orderBy('teacher.lastName', 'ASC')
      .take(20);
    if (query.search) {
      qb.andWhere('(teacher.firstName ILIKE :search OR teacher.lastName ILIKE :search)', { search: `%${query.search}%` });
    }
    return qb.getMany();
  }

  async findOne(id: string, meta: RequestMeta): Promise<Teacher> {
    const teacher = await this.teachers.findOne({ where: { id }, relations: { user: true, branch: true } });
    if (!teacher) {
      throw new RpcNotFoundException('Teacher not found');
    }
    if (isTeacherScoped(meta) && teacher.userId !== meta.userId) {
      throw new RpcForbiddenException('You can only view your own profile');
    }
    return teacher;
  }

  async findMine(meta: RequestMeta): Promise<Teacher> {
    const teacher = await this.teachers.findOne({ where: { userId: meta.userId }, relations: { user: true, branch: true } });
    if (!teacher) {
      throw new RpcNotFoundException('No teacher profile is linked to this account');
    }
    return teacher;
  }

  async create(dto: CreateTeacherDto, meta: RequestMeta): Promise<Teacher> {
    const teacher = await this.dataSource
      .transaction(async (manager) => {
        const roles = manager.getRepository(Role);
        const users = manager.getRepository(User);
        const role = await roles.findOne({ where: { name: RoleName.TEACHER } });
        if (!role) {
          throw new RpcBadRequestException('TEACHER role is missing');
        }
        const user = await users.save(
          users.create({
            email: dto.email.toLowerCase(),
            passwordHash: await bcrypt.hash(dto.password, 10),
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            isActive: true,
            roles: [role],
          }),
        );
        return manager.getRepository(Teacher).save(
          manager.getRepository(Teacher).create({
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            specialization: dto.specialization ?? null,
            bio: dto.bio ?? null,
            photoUrl: dto.photoUrl ?? null,
            hireDate: dto.hireDate ?? null,
            salaryType: dto.salaryType,
            salaryAmount: dto.salaryAmount ?? 0,
            status: dto.status,
            branchId: dto.branchId ?? null,
          }),
        );
      })
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Teacher', teacher.id, null, this.snapshot(teacher));
    this.rpc.emit(EVENTS.TEACHER_CREATED, { teacherId: teacher.id, createdBy: meta.userId });
    return this.findOne(teacher.id, meta);
  }

  async update(id: string, dto: UpdateTeacherDto, meta: RequestMeta): Promise<Teacher> {
    const teacher = await this.findOne(id, meta);
    if (isTeacherScoped(meta)) {
      const allowed: UpdateTeacherDto = { bio: dto.bio, photoUrl: dto.photoUrl, phone: dto.phone };
      dto = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined)) as UpdateTeacherDto;
    }
    const before = this.snapshot(teacher);
    const { email, password, ...fields } = dto;
    await this.dataSource
      .transaction(async (manager) => {
        const userPatch: Partial<User> = {};
        if (email) userPatch.email = email.toLowerCase();
        if (password) userPatch.passwordHash = await bcrypt.hash(password, 10);
        if (fields.firstName) userPatch.firstName = fields.firstName;
        if (fields.lastName) userPatch.lastName = fields.lastName;
        if (fields.phone) userPatch.phone = fields.phone;
        if (fields.status) userPatch.isActive = fields.status !== TeacherStatus.TERMINATED;
        if (Object.keys(userPatch).length > 0) {
          await manager.getRepository(User).update(teacher.userId, userPatch);
        }
        Object.assign(teacher, fields);
        await manager.getRepository(Teacher).save(teacher);
      })
      .catch(translateDatabaseError);
    const saved = await this.findOne(id, meta);
    this.audit.publish(meta, AuditAction.UPDATE, 'Teacher', id, before, this.snapshot(saved));
    return saved;
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const teacher = await this.findOne(id, meta);
    const activeGroups = await this.groups.count({ where: { teacherId: id, status: GroupStatus.ACTIVE } });
    if (activeGroups > 0) {
      throw new RpcBadRequestException('Teacher still has active groups; reassign them first');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Teacher).softRemove(teacher);
      await manager.getRepository(User).update(teacher.userId, { isActive: false });
    });
    this.audit.publish(meta, AuditAction.DELETE, 'Teacher', id, this.snapshot(teacher), null);
    return { deleted: true };
  }

  private snapshot(teacher: Teacher): Record<string, unknown> {
    return {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      phone: teacher.phone,
      specialization: teacher.specialization,
      status: teacher.status,
      salaryType: teacher.salaryType,
      salaryAmount: teacher.salaryAmount,
      branchId: teacher.branchId,
    };
  }
}
