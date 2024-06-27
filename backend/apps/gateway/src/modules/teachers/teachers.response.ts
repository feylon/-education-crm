import { SalaryType, TeacherStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class TeacherResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() phone: string;
  @ApiProperty({ nullable: true }) specialization: string | null;
  @ApiProperty({ nullable: true }) bio: string | null;
  @ApiProperty({ nullable: true }) photoUrl: string | null;
  @ApiProperty({ nullable: true }) hireDate: string | null;
  @ApiProperty({ enum: SalaryType }) salaryType: SalaryType;
  @ApiProperty() salaryAmount: number;
  @ApiProperty({ enum: TeacherStatus }) status: TeacherStatus;
  @ApiProperty({ nullable: true }) branchId: string | null;
  @ApiProperty({ required: false }) groupsCount?: number;
  @ApiProperty() createdAt: Date;
}
