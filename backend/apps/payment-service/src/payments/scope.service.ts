import { RequestMeta } from '@app/common/interfaces';
import { RpcForbiddenException } from '@app/common/rpc';
import { isStudentScoped, isTeacherScoped } from '@app/common/utils';
import { Student, Teacher } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ScopeService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
  ) {}

  async applyStudentScope<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, alias: string, meta: RequestMeta): Promise<void> {
    if (isStudentScoped(meta)) {
      const student = await this.students.findOne({ where: { userId: meta.userId } });
      qb.andWhere(`${alias}.studentId = :scopedStudentId`, { scopedStudentId: student?.id ?? NIL_UUID });
    } else if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      qb.andWhere(
        `EXISTS (SELECT 1 FROM groups g WHERE g.id = ${alias}."groupId" AND g."teacherId" = :scopedTeacherId)`,
        { scopedTeacherId: teacher?.id ?? NIL_UUID },
      );
    }
  }

  async assertStudentAccess(studentId: string, meta: RequestMeta): Promise<void> {
    if (isStudentScoped(meta)) {
      const student = await this.students.findOne({ where: { userId: meta.userId } });
      if (student?.id !== studentId) {
        throw new RpcForbiddenException('You can only view your own payments');
      }
    } else if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      const shared = await this.students
        .createQueryBuilder('student')
        .innerJoin('student.enrollments', 'enrollment')
        .innerJoin('enrollment.group', 'group', 'group.teacherId = :teacherId', { teacherId: teacher?.id ?? NIL_UUID })
        .where('student.id = :studentId', { studentId })
        .getCount();
      if (!shared) {
        throw new RpcForbiddenException('This student is not in your groups');
      }
    }
  }

  async assertGroupAccess(groupId: string, meta: RequestMeta): Promise<void> {
    if (isStudentScoped(meta)) {
      throw new RpcForbiddenException('Students cannot view group finance');
    }
    if (isTeacherScoped(meta)) {
      const teacher = await this.teachers.findOne({ where: { userId: meta.userId } });
      const owns = await this.teachers.manager
        .createQueryBuilder()
        .select('1')
        .from('groups', 'g')
        .where('g.id = :groupId AND g."teacherId" = :teacherId', { groupId, teacherId: teacher?.id ?? NIL_UUID })
        .getRawOne();
      if (!owns) {
        throw new RpcForbiddenException('You can only view your own groups');
      }
    }
  }

  assertStaff(meta: RequestMeta): void {
    if (isStudentScoped(meta) || isTeacherScoped(meta)) {
      throw new RpcForbiddenException('Only staff can manage billing');
    }
  }
}
