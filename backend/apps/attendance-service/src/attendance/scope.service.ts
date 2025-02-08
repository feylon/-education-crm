import { RequestMeta } from '@app/common/interfaces';
import { RpcForbiddenException } from '@app/common/rpc';
import { isStudentScoped, isTeacherScoped } from '@app/common/utils';
import { Group, Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ScopeService {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
  ) {}

  async teacherId(meta: RequestMeta): Promise<string | null> {
    const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
    return teacher?.id ?? null;
  }

  async studentId(meta: RequestMeta): Promise<string | null> {
    const student = await this.students.findOne({ where: { userId: meta.userId } });
    return student?.id ?? null;
  }

  async applyGroupScope<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, groupAlias: string, meta: RequestMeta): Promise<void> {
    if (isTeacherScoped(meta)) {
      qb.andWhere(`${groupAlias}.teacherId = :scopedTeacherId`, { scopedTeacherId: (await this.teacherId(meta)) ?? NIL_UUID });
    } else if (isStudentScoped(meta)) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM group_students gs WHERE gs."groupId" = ${groupAlias}.id AND gs."studentId" = :scopedStudentId)`,
        { scopedStudentId: (await this.studentId(meta)) ?? NIL_UUID },
      );
    }
  }

  async assertGroupAccess(groupId: string, meta: RequestMeta): Promise<Group> {
    const group = await this.groups.findOne({ where: { id: groupId } });
    if (!group) {
      throw new RpcForbiddenException('Group is not accessible');
    }
    if (isTeacherScoped(meta) && group.teacherId !== (await this.teacherId(meta))) {
      throw new RpcForbiddenException('You can only work with your own groups');
    }
    if (isStudentScoped(meta)) {
      throw new RpcForbiddenException('Students cannot manage lessons');
    }
    return group;
  }

  async assertGroupReadAccess(groupId: string, meta: RequestMeta): Promise<void> {
    if (isTeacherScoped(meta)) {
      const group = await this.groups.findOne({ where: { id: groupId } });
      if (!group || group.teacherId !== (await this.teacherId(meta))) {
        throw new RpcForbiddenException('You can only view your own groups');
      }
    } else if (isStudentScoped(meta)) {
      const studentId = (await this.studentId(meta)) ?? NIL_UUID;
      const enrolled = await this.groups
        .createQueryBuilder('group')
        .innerJoin('group.enrollments', 'enrollment', 'enrollment.studentId = :studentId', { studentId })
        .where('group.id = :groupId', { groupId })
        .getCount();
      if (!enrolled) {
        throw new RpcForbiddenException('You are not enrolled in this group');
      }
    }
  }

  async ownStudentFilter(meta: RequestMeta): Promise<string | null> {
    return isStudentScoped(meta) ? ((await this.studentId(meta)) ?? NIL_UUID) : null;
  }

  async assertStudentAccess(studentId: string, meta: RequestMeta): Promise<void> {
    if (isStudentScoped(meta) && (await this.studentId(meta)) !== studentId) {
      throw new RpcForbiddenException('You can only view your own attendance');
    }
    if (isTeacherScoped(meta)) {
      const teacherId = (await this.teacherId(meta)) ?? NIL_UUID;
      const shared = await this.groups
        .createQueryBuilder('group')
        .innerJoin('group.enrollments', 'enrollment', 'enrollment.studentId = :studentId', { studentId })
        .where('group.teacherId = :teacherId', { teacherId })
        .getCount();
      if (!shared) {
        throw new RpcForbiddenException('This student is not in your groups');
      }
    }
  }
}
