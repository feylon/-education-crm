import { AuditPublisher } from '@app/common/audit';
import { EVENTS } from '@app/common/constants';
import { EnrollStudentDto, GroupStudentsQueryDto, UpdateEnrollmentDto } from '@app/common/dto';
import { AuditAction, EnrollmentStatus, GroupStatus, StudentStatus } from '@app/common/enums';
import { Paginated, RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcClientService, RpcNotFoundException } from '@app/common/rpc';
import { applySorting, paginateQuery, toDateOnly, translateDatabaseError } from '@app/common/utils';
import { Group, GroupStudent, Student } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { GroupsService } from './groups.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(GroupStudent) private readonly enrollments: Repository<GroupStudent>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly groups: GroupsService,
    private readonly dataSource: DataSource,
    private readonly audit: AuditPublisher,
    private readonly rpc: RpcClientService,
  ) {}

  async list(groupId: string, query: GroupStudentsQueryDto, meta: RequestMeta): Promise<Paginated<GroupStudent>> {
    this.groups.assertNotStudent(meta);
    await this.groups.assertCanAccess(groupId, meta);
    const qb = this.enrollments
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.groupId = :groupId', { groupId });
    if (query.status) qb.andWhere('enrollment.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.phone ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    applySorting(qb, 'enrollment', { ...query, sortBy: query.sortBy ?? 'joinedAt' }, ['joinedAt', 'status', 'createdAt'], 'joinedAt');
    return paginateQuery(qb, query);
  }

  async enroll(groupId: string, dto: EnrollStudentDto, meta: RequestMeta): Promise<GroupStudent> {
    this.groups.assertStaffOnly(meta);
    const group = await this.groups.findOne(groupId, meta);
    if (group.status === GroupStatus.COMPLETED || group.status === GroupStatus.CANCELLED) {
      throw new RpcBadRequestException('Cannot enroll into a completed or cancelled group');
    }
    const student = await this.students.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new RpcBadRequestException('Student does not exist');
    }
    if (student.status === StudentStatus.DROPPED) {
      throw new RpcBadRequestException('Dropped students cannot be enrolled');
    }
    const saved = await this.dataSource
      .transaction(async (manager) => {
        await this.assertCapacity(manager, group.id, group.capacity);
        const repo = manager.getRepository(GroupStudent);
        const existing = await repo.findOne({ where: { groupId, studentId: dto.studentId } });
        if (existing?.status === EnrollmentStatus.ACTIVE) {
          throw new RpcBadRequestException('Student is already enrolled in this group');
        }
        const enrollment = existing ?? repo.create({ groupId, studentId: dto.studentId });
        enrollment.status = EnrollmentStatus.ACTIVE;
        enrollment.joinedAt = dto.joinedAt ?? toDateOnly(new Date());
        enrollment.leftAt = null;
        enrollment.discountPercent = dto.discountPercent ?? 0;
        enrollment.notes = dto.notes ?? null;
        return repo.save(enrollment);
      })
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.ASSIGN, 'GroupStudent', saved.id, null, {
      groupId,
      studentId: dto.studentId,
      discountPercent: saved.discountPercent,
    });
    this.rpc.emit(EVENTS.GROUP_STUDENT_ENROLLED, {
      groupId,
      groupName: group.name,
      teacherId: group.teacherId,
      studentId: student.id,
      studentName: `${student.lastName} ${student.firstName}`,
      enrollmentId: saved.id,
      actorId: meta.userId,
    });
    return this.enrollments.findOneOrFail({ where: { id: saved.id }, relations: { student: true } });
  }

  async update(groupId: string, enrollmentId: string, dto: UpdateEnrollmentDto, meta: RequestMeta): Promise<GroupStudent> {
    this.groups.assertStaffOnly(meta);
    const enrollment = await this.find(groupId, enrollmentId);
    const before = this.snapshot(enrollment);
    if (dto.discountPercent !== undefined) enrollment.discountPercent = dto.discountPercent;
    if (dto.notes !== undefined) enrollment.notes = dto.notes;
    const saved = await this.dataSource.transaction(async (manager) => {
      if (dto.status && dto.status !== enrollment.status) {
        if (dto.status === EnrollmentStatus.ACTIVE) {
          if (enrollment.group.status === GroupStatus.COMPLETED || enrollment.group.status === GroupStatus.CANCELLED) {
            throw new RpcBadRequestException('Cannot re-activate a student in a completed or cancelled group');
          }
          await this.assertCapacity(manager, groupId, enrollment.group.capacity);
        }
        enrollment.status = dto.status;
        enrollment.leftAt = dto.status === EnrollmentStatus.ACTIVE ? null : (dto.leftAt ?? toDateOnly(new Date()));
      } else if (dto.leftAt !== undefined) {
        enrollment.leftAt = dto.leftAt;
      }
      return manager.getRepository(GroupStudent).save(enrollment);
    });
    this.audit.publish(meta, AuditAction.UPDATE, 'GroupStudent', enrollmentId, before, this.snapshot(saved));
    return this.enrollments.findOneOrFail({ where: { id: enrollmentId }, relations: { student: true } });
  }

  async unenroll(groupId: string, enrollmentId: string, meta: RequestMeta): Promise<GroupStudent> {
    this.groups.assertStaffOnly(meta);
    const enrollment = await this.find(groupId, enrollmentId);
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new RpcBadRequestException('Student is not active in this group');
    }
    const before = this.snapshot(enrollment);
    enrollment.status = EnrollmentStatus.LEFT;
    enrollment.leftAt = toDateOnly(new Date());
    const saved = await this.enrollments.save(enrollment);
    this.audit.publish(meta, AuditAction.UNASSIGN, 'GroupStudent', enrollmentId, before, this.snapshot(saved));
    this.rpc.emit(EVENTS.GROUP_STUDENT_LEFT, {
      groupId,
      studentId: enrollment.studentId,
      teacherId: enrollment.group?.teacherId ?? null,
      groupName: enrollment.group?.name,
      actorId: meta.userId,
    });
    return saved;
  }

  private async assertCapacity(manager: EntityManager, groupId: string, capacity: number): Promise<void> {
    await manager.getRepository(Group).createQueryBuilder('group').setLock('pessimistic_write').where('group.id = :groupId', { groupId }).getOne();
    const activeCount = await manager.getRepository(GroupStudent).count({ where: { groupId, status: EnrollmentStatus.ACTIVE } });
    if (activeCount >= capacity) {
      throw new RpcBadRequestException(`Group is full (capacity ${capacity})`);
    }
  }

  private async find(groupId: string, enrollmentId: string): Promise<GroupStudent> {
    const enrollment = await this.enrollments.findOne({ where: { id: enrollmentId, groupId }, relations: { group: true, student: true } });
    if (!enrollment) {
      throw new RpcNotFoundException('Enrollment not found');
    }
    return enrollment;
  }

  private snapshot(enrollment: GroupStudent): Record<string, unknown> {
    return {
      groupId: enrollment.groupId,
      studentId: enrollment.studentId,
      status: enrollment.status,
      discountPercent: enrollment.discountPercent,
      joinedAt: enrollment.joinedAt,
      leftAt: enrollment.leftAt,
    };
  }
}
