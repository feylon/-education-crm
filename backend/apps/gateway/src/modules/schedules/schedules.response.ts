import { ApiProperty } from '@nestjs/swagger';

export class BranchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) address: string | null;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ required: false }) roomsCount?: number;
}

export class RoomResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() branchId: string;
  @ApiProperty() name: string;
  @ApiProperty() capacity: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: BranchResponseDto, required: false }) branch?: BranchResponseDto;
}

export class ScheduleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() groupId: string;
  @ApiProperty({ nullable: true }) roomId: string | null;
  @ApiProperty({ minimum: 1, maximum: 7 }) weekday: number;
  @ApiProperty({ example: '09:00:00' }) startTime: string;
  @ApiProperty({ example: '10:30:00' }) endTime: string;
  @ApiProperty() effectiveFrom: string;
  @ApiProperty({ nullable: true }) effectiveTo: string | null;
}
