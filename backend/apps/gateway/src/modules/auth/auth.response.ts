import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty({ type: [String] }) roles: string[];
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty({ nullable: true }) teacherId: string | null;
  @ApiProperty({ nullable: true }) studentId: string | null;
}

export class TokenPairResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Access token lifetime in seconds' }) expiresIn: number;
}

export class LoginResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: AuthUserResponseDto }) user: AuthUserResponseDto;
}
