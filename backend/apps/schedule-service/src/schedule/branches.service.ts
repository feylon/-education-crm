import { AuditPublisher } from '@app/common/audit';
import { CreateBranchDto, UpdateBranchDto } from '@app/common/dto';
import { AuditAction } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcBadRequestException, RpcNotFoundException } from '@app/common/rpc';
import { translateDatabaseError } from '@app/common/utils';
import { Branch, Room } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    private readonly audit: AuditPublisher,
  ) {}

  findAll(): Promise<Branch[]> {
    return this.branches
      .createQueryBuilder('branch')
      .loadRelationCountAndMap('branch.roomsCount', 'branch.rooms')
      .orderBy('branch.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branches.findOne({ where: { id } });
    if (!branch) {
      throw new RpcNotFoundException('Branch not found');
    }
    return branch;
  }

  async create(dto: CreateBranchDto, meta: RequestMeta): Promise<Branch> {
    const branch = await this.branches
      .save(this.branches.create({ name: dto.name, address: dto.address ?? null, phone: dto.phone ?? null, isActive: dto.isActive ?? true }))
      .catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.CREATE, 'Branch', branch.id, null, { ...dto });
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, meta: RequestMeta): Promise<Branch> {
    const branch = await this.findOne(id);
    const before = { name: branch.name, address: branch.address, phone: branch.phone, isActive: branch.isActive };
    Object.assign(branch, dto);
    const saved = await this.branches.save(branch).catch(translateDatabaseError);
    this.audit.publish(meta, AuditAction.UPDATE, 'Branch', id, before, { ...dto });
    return saved;
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const branch = await this.findOne(id);
    const rooms = await this.rooms.count({ where: { branchId: id } });
    if (rooms > 0) {
      throw new RpcBadRequestException('Branch has rooms and cannot be deleted');
    }
    await this.branches.softRemove(branch);
    this.audit.publish(meta, AuditAction.DELETE, 'Branch', id, { name: branch.name }, null);
    return { deleted: true };
  }
}
