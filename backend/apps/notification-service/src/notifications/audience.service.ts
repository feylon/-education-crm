import { RoleName } from '@app/common/enums';
import { Group, Parent, Student, Teacher, User } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

export interface StudentContacts {
  userId: string | null;
  chatIds: string[];
  fullName: string;
}

@Injectable()
export class AudienceService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(Parent) private readonly parents: Repository<Parent>,
  ) {}

  async usersWithRoles(roles: string[]): Promise<string[]> {
    const rows = await this.users
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .select('user.id', 'id')
      .where('user.isActive = true')
      .andWhere('role.name IN (:...roles)', { roles })
      .getRawMany<{ id: string }>();
    return [...new Set(rows.map((row) => row.id))];
  }

  staff(): Promise<string[]> {
    return this.usersWithRoles([RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER]);
  }

  finance(): Promise<string[]> {
    return this.usersWithRoles([RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER, RoleName.CASHIER]);
  }

  async teacherUser(teacherId: string | null | undefined): Promise<string | null> {
    if (!teacherId) {
      return null;
    }
    const teacher = await this.teachers.findOne({ where: { id: teacherId } });
    return teacher?.userId ?? null;
  }

  async groupTeacherUser(groupId: string): Promise<string | null> {
    const group = await this.groups.findOne({ where: { id: groupId } });
    return this.teacherUser(group?.teacherId);
  }

  async studentContacts(studentId: string): Promise<StudentContacts | null> {
    const student = await this.students.findOne({ where: { id: studentId } });
    if (!student) {
      return null;
    }
    const parents = await this.parents.find({ where: { studentId } });
    const chatIds = [student.telegramChatId, ...parents.map((parent) => parent.telegramChatId)].filter((id): id is string => Boolean(id));
    return { userId: student.userId, chatIds: [...new Set(chatIds)], fullName: `${student.lastName} ${student.firstName}` };
  }

  async chatIdsForUsers(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const users = await this.users.find({ where: { id: In(userIds) }, select: { id: true, telegramChatId: true } });
    return new Map(users.filter((user) => user.telegramChatId).map((user) => [user.id, user.telegramChatId as string]));
  }
}
