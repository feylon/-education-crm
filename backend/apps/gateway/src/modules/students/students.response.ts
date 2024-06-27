import { Gender, StudentStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class ParentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
  @ApiProperty() phone: string;
  @ApiProperty() relation: string;
  @ApiProperty() isPrimary: boolean;
}

export class StudentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) middleName: string | null;
  @ApiProperty({ enum: Gender, nullable: true }) gender: Gender | null;
  @ApiProperty({ nullable: true }) birthDate: string | null;
  @ApiProperty() phone: string;
  @ApiProperty({ nullable: true }) email: string | null;
  @ApiProperty({ nullable: true }) address: string | null;
  @ApiProperty({ nullable: true }) photoUrl: string | null;
  @ApiProperty({ enum: StudentStatus }) status: StudentStatus;
  @ApiProperty({ nullable: true }) branchId: string | null;
  @ApiProperty({ type: [ParentResponseDto], required: false }) parents?: ParentResponseDto[];
  @ApiProperty() createdAt: Date;
}
