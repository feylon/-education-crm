import { EnrollmentStatus, GroupStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';
import { StudentResponseDto } from '../students/students.response';

export class GroupResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() courseId: string;
  @ApiProperty({ nullable: true }) teacherId: string | null;
  @ApiProperty({ nullable: true }) roomId: string | null;
  @ApiProperty({ nullable: true }) branchId: string | null;
  @ApiProperty() startDate: string;
  @ApiProperty({ nullable: true }) endDate: string | null;
  @ApiProperty() monthlyFee: number;
  @ApiProperty() capacity: number;
  @ApiProperty({ enum: GroupStatus }) status: GroupStatus;
  @ApiProperty({ required: false }) studentsCount?: number;
  @ApiProperty() createdAt: Date;
}

export class EnrollmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() groupId: string;
  @ApiProperty() studentId: string;
  @ApiProperty() joinedAt: string;
  @ApiProperty({ nullable: true }) leftAt: string | null;
  @ApiProperty() discountPercent: number;
  @ApiProperty({ enum: EnrollmentStatus }) status: EnrollmentStatus;
  @ApiProperty({ type: StudentResponseDto, required: false }) student?: StudentResponseDto;
}
