import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { CreateStudentDto, LookupQueryDto, ParentDto, StudentQueryDto, UpdateParentDto, UpdateStudentDto } from '@app/common/dto';
import { AuditAction, EnrollmentStatus, RoleName } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcForbiddenException, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, isStudentScoped, isTeacherScoped, paginateQuery, translateDatabaseError } from '@app/common/utils';
import { Parent, RefreshToken, Role, Student, Teacher, User } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';

const SORTABLE = ['createdAt', 'firstName', 'lastName', 'phone', 'status', 'birthDate'];

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async findAll(query: StudentQueryDto, meta: RequestMeta): Promise<Paginated<Student>> {
    const qb = this.students
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.branch', 'branch')
      .leftJoinAndSelect('student.enrollments', 'enrollment', 'enrollment.status = :active', {
        active: EnrollmentStatus.ACTIVE,
      })
      .leftJoinAndSelect('enrollment.group', 'group');
    if (query.search) {
      qb.andWhere(
        '(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search OR student.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('student.status = :status', { status: query.status });
    if (query.gender) qb.andWhere('student.gender = :gender', { gender: query.gender });
    if (query.branchId) qb.andWhere('student.branchId = :branchId', { branchId: query.branchId });
    if (query.groupId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM group_students gs WHERE gs."studentId" = student.id AND gs."groupId" = :groupId)',
        { groupId: query.groupId },
      );
    }
    await this.applyScope(qb, meta);
    applySorting(qb, 'student', query, SORTABLE);
    return paginateQuery(qb, query);
  }

  async lookup(query: LookupQueryDto, meta: RequestMeta): Promise<Student[]> {
    const qb = this.students.createQueryBuilder('student').orderBy('student.lastName', 'ASC').take(20);
    if (query.search) {
      qb.where('(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    await this.applyScope(qb, meta);
    return qb.getMany();
  }

  async findOne(id: string, meta: RequestMeta): Promise<Student> {
    const student = await this.students.findOne({ where: { id }, relations: { parents: true, branch: true } });
    if (!student) {
      throw new RpcNotFoundException('Student not found');
    }
    await this.assertCanView(student, meta);
    return student;
  }

  async findMine(meta: RequestMeta): Promise<Student> {
    const student = await this.students.findOne({ where: { userId: meta.userId }, relations: { parents: true, branch: true } });
    if (!student) {
      throw new RpcNotFoundException('No student profile is linked to this account');
    }
    return student;
  }

  async create(dto: CreateStudentDto, meta: RequestMeta): Promise<Student> {
    const { parents, accountPassword, ...fields } = dto;
    const student = await this.dataSource
      .transaction(async (manager) => {
        const user = accountPassword ? await this.createAccount(manager.getRepository(User), manager.getRepository(Role), dto, accountPassword) : null;
        const created = await manager.getRepository(Student).save(
          manager.getRepository(Student).create({
            ...fields,
            email: fields.email ?? null,
            userId: user?.id ?? null,
            parents: (parents ?? []).map((parent) => this.toParent(parent)),
          }),
        );
        return created;
      })
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Student', student.id, null, this.snapshot(student));
    this.rpc.emit(EVENTS.STUDENT_CREATED, {
      studentId: student.id,
      fullName: `${student.lastName} ${student.firstName}`,
      createdBy: meta.userId,
    });
    return this.findOne(student.id, meta);
  }

  async update(id: string, dto: UpdateStudentDto, meta: RequestMeta): Promise<Student> {
    const student = await this.findOne(id, meta);
    if (isStudentScoped(meta)) {
      throw new RpcForbiddenException('Students cannot edit their profile');
    }
    const before = this.snapshot(student);
    const { parents, accountPassword, ...fields } = dto;
    Object.assign(student, fields);
    if (accountPassword) {
      await this.dataSource.transaction(async (manager) => {
        if (student.userId) {
          await manager.getRepository(User).update(student.userId, { passwordHash: await bcrypt.hash(accountPassword, 10) });
          await manager.getRepository(RefreshToken).update({ userId: student.userId }, { revokedAt: new Date() });
        } else {
          const user = await this.createAccount(manager.getRepository(User), manager.getRepository(Role), student, accountPassword);
          student.userId = user.id;
        }
      });
    }
    const saved = await this.dataSource
      .transaction(async (manager) => {
        if (parents) {
          await manager.getRepository(Parent).delete({ studentId: id });
          student.parents = parents.map((parent) => this.toParent(parent));
        }
        if (student.userId && fields.email) {
          await manager.getRepository(User).update(student.userId, { email: fields.email.toLowerCase() });
        }
        return manager.getRepository(Student).save(student);
      })
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Student', id, before, this.snapshot(saved));
    this.rpc.emit(EVENTS.STUDENT_UPDATED, { studentId: id, updatedBy: meta.userId });
    return this.findOne(id, meta);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const student = await this.findOne(id, meta);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Student).softDelete(student.id);
      if (student.userId) {
        await manager.getRepository(User).update(student.userId, { isActive: false });
      }
    });
    this.audit.publish(meta, AuditAction.DELETE, 'Student', id, this.snapshot(student), null);
    this.rpc.emit(EVENTS.STUDENT_DELETED, { studentId: id, deletedBy: meta.userId });
    return { deleted: true };
  }

  async addParent(studentId: string, dto: ParentDto, meta: RequestMeta): Promise<Parent> {
    await this.findOne(studentId, meta);
    const parent = await this.parents.save(this.parents.create({ ...this.toParent(dto), studentId }));
    this.audit.publish(meta, AuditAction.CREATE, 'Parent', parent.id, null, { ...dto, studentId });
    return parent;
  }

  async updateParent(studentId: string, parentId: string, dto: UpdateParentDto, meta: RequestMeta): Promise<Parent> {
    await this.findOne(studentId, meta);
    const parent = await this.parents.findOne({ where: { id: parentId, studentId } });
    if (!parent) {
      throw new RpcNotFoundException('Parent not found');
    }
    const before = { fullName: parent.fullName, phone: parent.phone, relation: parent.relation, isPrimary: parent.isPrimary };
    Object.assign(parent, dto);
    const saved = await this.parents.save(parent);
    this.audit.publish(meta, AuditAction.UPDATE, 'Parent', parentId, before, { ...dto });
    return saved;
  }

  async removeParent(studentId: string, parentId: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    await this.findOne(studentId, meta);
    const result = await this.parents.delete({ id: parentId, studentId });
    if (!result.affected) {
      throw new RpcNotFoundException('Parent not found');
    }
    this.audit.publish(meta, AuditAction.DELETE, 'Parent', parentId, null, null);
    return { deleted: true };
  }

  private async createAccount(
    users: Repository<User>,
    roles: Repository<Role>,
    data: { email?: string | null; firstName: string; lastName: string; phone: string },
    password: string,
  ): Promise<User> {
    if (!data.email) {
      throw new RpcBadRequestException('Email is required to create a login account');
    }
    const role = await roles.findOne({ where: { name: RoleName.STUDENT } });
    if (!role) {
      throw new RpcBadRequestException('STUDENT role is missing');
    }
    return users.save(
      users.create({
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isActive: true,
        roles: [role],
      }),
    );
  }

  private toParent(dto: ParentDto): Parent {
    return this.parents.create({
      fullName: dto.fullName,
      phone: dto.phone,
      relation: dto.relation ?? 'PARENT',
      isPrimary: dto.isPrimary ?? false,
    });
  }

  private async applyScope(qb: ReturnType<Repository<Student>['createQueryBuilder']>, meta: RequestMeta): Promise<void> {
    if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      qb.andWhere(
        'EXISTS (SELECT 1 FROM group_students gs INNER JOIN groups g ON g.id = gs."groupId" WHERE gs."studentId" = student.id AND g."teacherId" = :teacherId)',
        { teacherId: teacher?.id ?? '00000000-0000-0000-0000-000000000000' },
      );
    } else if (isStudentScoped(meta)) {
      qb.andWhere('student.userId = :selfUserId', { selfUserId: meta.userId });
    }
  }

  private async assertCanView(student: Student, meta: RequestMeta): Promise<void> {
    if (isStudentScoped(meta) && student.userId !== meta.userId) {
      throw new RpcForbiddenException('You can only view your own profile');
    }
    if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      const shared = teacher
        ? await this.students
            .createQueryBuilder('student')
            .innerJoin('student.enrollments', 'enrollment')
            .innerJoin('enrollment.group', 'group', 'group.teacherId = :teacherId', { teacherId: teacher.id })
            .where('student.id = :id', { id: student.id })
            .getCount()
        : 0;
      if (!shared) {
        throw new RpcForbiddenException('This student is not in your groups');
      }
    }
  }

  private snapshot(student: Student): Record<string, unknown> {
    return {
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      email: student.email,
      status: student.status,
      branchId: student.branchId,
    };
  }
}
