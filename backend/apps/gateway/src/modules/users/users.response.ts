import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() module: string;
  @ApiProperty() description: string;
}

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() isSystem: boolean;
  @ApiProperty({ type: [PermissionResponseDto] }) permissions: PermissionResponseDto[];
}

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ nullable: true }) lastLoginAt: Date | null;
  @ApiProperty({ type: [RoleResponseDto] }) roles: RoleResponseDto[];
  @ApiProperty() createdAt: Date;
}

export class AuditLogResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) userId: string | null;
  @ApiProperty({ nullable: true }) userEmail: string | null;
  @ApiProperty() action: string;
  @ApiProperty() entity: string;
  @ApiProperty({ nullable: true }) entityId: string | null;
  @ApiProperty({ nullable: true }) oldValue: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) newValue: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) ip: string | null;
  @ApiProperty() createdAt: Date;
}
