import { AuditPublisher } from '@app/common/audit';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto } from '@app/common/dto';
import { AuditAction } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { translateDatabaseError } from '@app/common/utils';
import { Branch, Room, Schedule } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Schedule) private readonly schedules: Repository<Schedule>,
    private readonly audit: AuditPublisher,
  ) {}

  findAll(query: RoomQueryDto): Promise<Room[]> {
    const qb = this.rooms.createQueryBuilder('room').leftJoinAndSelect('room.branch', 'branch').orderBy('branch.name').addOrderBy('room.name');
    if (query.branchId) {
      qb.where('room.branchId = :branchId', { branchId: query.branchId });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.rooms.findOne({ where: { id }, relations: { branch: true } });
    if (!room) {
      throw new RpcNotFoundException('Room not found');
    }
    return room;
  }

  async create(dto: CreateRoomDto, meta: RequestMeta): Promise<Room> {
    if (!(await this.branches.exist({ where: { id: dto.branchId } }))) {
      throw new RpcBadRequestException('Branch does not exist');
    }
    const room = await this.rooms
      .save(this.rooms.create({ branchId: dto.branchId, name: dto.name, capacity: dto.capacity ?? 12, isActive: dto.isActive ?? true }))
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Room', room.id, null, { ...dto });
    return this.findOne(room.id);
  }

  async update(id: string, dto: UpdateRoomDto, meta: RequestMeta): Promise<Room> {
    const room = await this.findOne(id);
    if (dto.branchId && !(await this.branches.exist({ where: { id: dto.branchId } }))) {
      throw new RpcBadRequestException('Branch does not exist');
    }
    const before = { name: room.name, capacity: room.capacity, branchId: room.branchId, isActive: room.isActive };
    Object.assign(room, dto);
    await this.rooms.save(room).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Room', id, before, { ...dto });
    return this.findOne(id);
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const room = await this.findOne(id);
    const inUse = await this.schedules.count({ where: { roomId: id } });
    if (inUse > 0) {
      throw new RpcBadRequestException('Room is used by schedules and cannot be deleted');
    }
    await this.rooms.softRemove(room);
    this.audit.publish(meta, AuditAction.DELETE, 'Room', id, { name: room.name }, null);
    return { deleted: true };
  }
}
