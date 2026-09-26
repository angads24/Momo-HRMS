import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ExceptionType {
  RECHECK_IN = 'RECHECK_IN',
  EXTRA_GRACE = 'EXTRA_GRACE',
  OFFICE_TRANSFER = 'OFFICE_TRANSFER',
  WORKING_TIME_ADJUSTMENT = 'WORKING_TIME_ADJUSTMENT',
}

export class CreateExceptionDto {
  @ApiProperty({ description: 'Employee ID for whom exception is requested', example: 'EMP-001' })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ description: 'Date of attendance (YYYY-MM-DD)', example: '2026-09-25' })
  @IsDateString()
  attendanceDate!: string;

  @ApiProperty({ enum: ExceptionType, example: ExceptionType.RECHECK_IN })
  @IsEnum(ExceptionType)
  type!: ExceptionType;

  @ApiProperty({ description: 'Reason for exception request', example: 'Site visit concluded, returned to office' })
  @IsString()
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional({ description: 'Specific session ID if applicable' })
  @IsOptional()
  @IsString()
  attendanceSessionId?: string;

  @ApiProperty({ description: 'Valid from timestamp (ISO-8601)', example: '2026-09-25T13:00:00.000Z' })
  @IsDateString()
  validFrom!: string;

  @ApiProperty({ description: 'Valid until timestamp (ISO-8601)', example: '2026-09-25T18:00:00.000Z' })
  @IsDateString()
  validUntil!: string;
}
