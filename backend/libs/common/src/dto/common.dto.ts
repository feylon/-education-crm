import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class LookupQueryDto {
  @ApiPropertyOptional({ description: 'Free text search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-06-30' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
