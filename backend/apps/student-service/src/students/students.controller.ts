import { STUDENT_PATTERNS } from '@app/common/constants';
import { CreateStudentDto, LookupQueryDto, ParentDto, StudentQueryDto, UpdateParentDto, UpdateStudentDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StudentProfileService } from './student-profile.service';
import { StudentsService } from './students.service';

@Controller()
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly profiles: StudentProfileService,
  ) {}

  @MessagePattern(STUDENT_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<StudentQueryDto>) {
    return this.students.findAll(payload.data, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.LOOKUP)
  lookup(@Payload() payload: WithMeta<LookupQueryDto>) {
    return this.students.lookup(payload.data, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.students.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.PROFILE)
  profile(@Payload() payload: WithMeta<{ id: string }>) {
    return this.profiles.build(payload.data.id, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.ME)
  async me(@Payload() payload: WithMeta<Record<string, never>>) {
    const student = await this.students.findMine(payload.meta);
    return this.profiles.build(student.id, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateStudentDto>) {
    return this.students.create(payload.data, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateStudentDto }>) {
    return this.students.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.students.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.PARENTS_ADD)
  addParent(@Payload() payload: WithMeta<{ studentId: string; dto: ParentDto }>) {
    return this.students.addParent(payload.data.studentId, payload.data.dto, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.PARENTS_UPDATE)
  updateParent(@Payload() payload: WithMeta<{ studentId: string; parentId: string; dto: UpdateParentDto }>) {
    return this.students.updateParent(payload.data.studentId, payload.data.parentId, payload.data.dto, payload.meta);
  }

  @MessagePattern(STUDENT_PATTERNS.PARENTS_REMOVE)
  removeParent(@Payload() payload: WithMeta<{ studentId: string; parentId: string }>) {
    return this.students.removeParent(payload.data.studentId, payload.data.parentId, payload.meta);
  }
}
