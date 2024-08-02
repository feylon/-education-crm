import { LessonStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class LessonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() groupId: string;
  @ApiProperty({ nullable: true }) scheduleId: string | null;
  @ApiProperty({ nullable: true }) teacherId: string | null;
  @ApiProperty({ nullable: true }) roomId: string | null;
  @ApiProperty() date: string;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty({ nullable: true }) topic: string | null;
  @ApiProperty({ enum: LessonStatus }) status: LessonStatus;
  @ApiProperty({ required: false }) markedCount?: number;
}
