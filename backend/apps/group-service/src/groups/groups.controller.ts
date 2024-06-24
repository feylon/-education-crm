import { GROUP_PATTERNS } from '@app/common/constants';
import {
  CreateGroupDto,
  EnrollStudentDto,
  GroupQueryDto,
  GroupStudentsQueryDto,
  LookupQueryDto,
  UpdateEnrollmentDto,
  UpdateGroupDto,
} from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EnrollmentsService } from './enrollments.service';
import { GroupStatisticsService } from './group-statistics.service';
import { GroupsService } from './groups.service';

@Controller()
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly enrollments: EnrollmentsService,
    private readonly statistics: GroupStatisticsService,
  ) {}

  @MessagePattern(GROUP_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<GroupQueryDto>) {
    return this.groups.findAll(payload.data, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.LOOKUP)
  lookup(@Payload() payload: WithMeta<LookupQueryDto>) {
    return this.groups.lookup(payload.data, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.groups.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateGroupDto>) {
    return this.groups.create(payload.data, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateGroupDto }>) {
    return this.groups.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.groups.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.STUDENTS)
  students(@Payload() payload: WithMeta<{ id: string; query: GroupStudentsQueryDto }>) {
    return this.enrollments.list(payload.data.id, payload.data.query, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.ENROLL)
  enroll(@Payload() payload: WithMeta<{ id: string; dto: EnrollStudentDto }>) {
    return this.enrollments.enroll(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.UPDATE_ENROLLMENT)
  updateEnrollment(@Payload() payload: WithMeta<{ id: string; enrollmentId: string; dto: UpdateEnrollmentDto }>) {
    return this.enrollments.update(payload.data.id, payload.data.enrollmentId, payload.data.dto, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.UNENROLL)
  unenroll(@Payload() payload: WithMeta<{ id: string; enrollmentId: string }>) {
    return this.enrollments.unenroll(payload.data.id, payload.data.enrollmentId, payload.meta);
  }

  @MessagePattern(GROUP_PATTERNS.STATISTICS)
  statisticsOf(@Payload() payload: WithMeta<{ id: string }>) {
    return this.statistics.build(payload.data.id, payload.meta);
  }
}
