import { SCHEDULE_PATTERNS } from '@app/common/constants';
import {
  CalendarQueryDto,
  CheckConflictsDto,
  CreateBranchDto,
  CreateRoomDto,
  CreateScheduleDto,
  RoomQueryDto,
  ScheduleQueryDto,
  UpdateBranchDto,
  UpdateRoomDto,
  UpdateScheduleDto,
} from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BranchesService } from './branches.service';
import { CalendarService } from './calendar.service';
import { RoomsService } from './rooms.service';
import { SchedulesService } from './schedules.service';

@Controller()
export class ScheduleController {
  constructor(
    private readonly schedules: SchedulesService,
    private readonly rooms: RoomsService,
    private readonly branches: BranchesService,
    private readonly calendar: CalendarService,
  ) {}

  @MessagePattern(SCHEDULE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: WithMeta<ScheduleQueryDto>) {
    return this.schedules.findAll(payload.data, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: WithMeta<{ id: string }>) {
    return this.schedules.findOne(payload.data.id, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.CREATE)
  create(@Payload() payload: WithMeta<CreateScheduleDto>) {
    return this.schedules.create(payload.data, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.UPDATE)
  update(@Payload() payload: WithMeta<{ id: string; dto: UpdateScheduleDto }>) {
    return this.schedules.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.schedules.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.CHECK_CONFLICTS)
  checkConflicts(@Payload() payload: WithMeta<CheckConflictsDto>) {
    return this.schedules.checkConflicts(payload.data);
  }

  @MessagePattern(SCHEDULE_PATTERNS.CALENDAR)
  calendarView(@Payload() payload: WithMeta<CalendarQueryDto>) {
    return this.calendar.build(payload.data, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.ROOMS_FIND_ALL)
  roomsList(@Payload() payload: WithMeta<RoomQueryDto>) {
    return this.rooms.findAll(payload.data);
  }

  @MessagePattern(SCHEDULE_PATTERNS.ROOMS_CREATE)
  createRoom(@Payload() payload: WithMeta<CreateRoomDto>) {
    return this.rooms.create(payload.data, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.ROOMS_UPDATE)
  updateRoom(@Payload() payload: WithMeta<{ id: string; dto: UpdateRoomDto }>) {
    return this.rooms.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.ROOMS_REMOVE)
  removeRoom(@Payload() payload: WithMeta<{ id: string }>) {
    return this.rooms.remove(payload.data.id, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.BRANCHES_FIND_ALL)
  branchesList() {
    return this.branches.findAll();
  }

  @MessagePattern(SCHEDULE_PATTERNS.BRANCHES_CREATE)
  createBranch(@Payload() payload: WithMeta<CreateBranchDto>) {
    return this.branches.create(payload.data, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.BRANCHES_UPDATE)
  updateBranch(@Payload() payload: WithMeta<{ id: string; dto: UpdateBranchDto }>) {
    return this.branches.update(payload.data.id, payload.data.dto, payload.meta);
  }

  @MessagePattern(SCHEDULE_PATTERNS.BRANCHES_REMOVE)
  removeBranch(@Payload() payload: WithMeta<{ id: string }>) {
    return this.branches.remove(payload.data.id, payload.meta);
  }
}
