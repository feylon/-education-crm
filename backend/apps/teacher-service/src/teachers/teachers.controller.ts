import { TEACHER_PATTERNS } from '@app/common/constants';
import { CreateTeacherDto, LookupQueryDto, TeacherQueryDto, UpdateTeacherDto } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeachersService } from './teachers.service';

@Controller()
export class TeachersController {
  constructor(
    private readonly teachers: TeachersService,
    private readonly dashboard: TeacherDashboardService,
  ) {}

  @MessagePattern(TEACHER_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<TeacherQueryDto>) {
    return this.teachers.findAll(payload.data);
  }

  @MessagePattern(TEACHER_PATTERNS.LOOKUP)
  lookup(@Payload() payload: WithMeta<LookupQueryDto>) {
    return this.teachers.lookup(payload.data);
  }

  @MessagePattern(TEACHER_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.teachers.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(TEACHER_PATTERNS.PROFILE)
  profile(@Payload() payload: WithMeta<{ id: string }>) {
    return this.dashboard.profile(payload.data.id, payload.meta);
  }

  @MessagePattern(TEACHER_PATTERNS.ME)
  me(@Payload() payload: WithMeta<Record<string, never>>) {
    return this.dashboard.dashboard(payload.meta);
  }

  @MessagePattern(TEACHER_PATTERNS.DASHBOARD)
  teacherDashboard(@Payload() payload: WithMeta<{ id?: string }>) {
    return this.dashboard.dashboard(payload.meta, payload.data.id);
  }

  @MessagePattern(TEACHER_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateTeacherDto>) {
    return this.teachers.create(payload.data, payload.meta);
  }

  @MessagePattern(TEACHER_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateTeacherDto }>) {
    return this.teachers.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(TEACHER_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.teachers.remove(payload.data.id, payload.meta);
  }
}
