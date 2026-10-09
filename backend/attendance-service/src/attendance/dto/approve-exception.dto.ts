import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ApproveStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ApproveExceptionDto {
  @ApiProperty({ enum: ApproveStatus, example: ApproveStatus.APPROVED })
  @IsEnum(ApproveStatus)
  @IsNotEmpty()
  status!: ApproveStatus;

  @ApiProperty({ description: 'Optional HR comment or note', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Optional HR approver name', required: false })
  @IsOptional()
  @IsString()
  approverName?: string;

  @ApiProperty({ description: 'Optional HR approver email', required: false })
  @IsOptional()
  @IsString()
  approverEmail?: string;

  @ApiProperty({ description: 'Optional employee ID for fallback recreation', required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'Optional attendance date (YYYY-MM-DD) for fallback recreation', required: false })
  @IsOptional()
  @IsString()
  attendanceDate?: string;

  @ApiProperty({ description: 'Optional additional hours for fallback recreation', required: false })
  @IsOptional()
  additionalHours?: number;

  @ApiProperty({ description: 'Optional reason for fallback recreation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Optional metadata dictionary', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

