import { CourseStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CourseCategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ required: false }) coursesCount?: number;
}

export class CourseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) categoryId: string | null;
  @ApiProperty({ type: CourseCategoryResponseDto, nullable: true }) category: CourseCategoryResponseDto | null;
  @ApiProperty() durationMonths: number;
  @ApiProperty() price: number;
  @ApiProperty({ enum: CourseStatus }) status: CourseStatus;
  @ApiProperty({ nullable: true }) color: string | null;
  @ApiProperty({ required: false }) groupsCount?: number;
  @ApiProperty() createdAt: Date;
}
