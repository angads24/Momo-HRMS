import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HistoryQueryDto {
  @ApiProperty({ required: false, example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, example: '2026-09-22' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  all?: string;
}
