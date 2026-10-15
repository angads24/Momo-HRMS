import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class QueryNotificationsDto {
  @ApiPropertyOptional({ description: 'Filter by recipient ID' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Filter by user email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by user role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by read status (true or false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Page number (optional for complete transfer)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page (optional)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
