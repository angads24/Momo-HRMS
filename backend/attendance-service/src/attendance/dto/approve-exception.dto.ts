import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ApproveStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ApproveExceptionDto {
  @ApiProperty({ enum: ApproveStatus, example: ApproveStatus.APPROVED })
  @IsEnum(ApproveStatus)
  @IsNotEmpty()
  status!: ApproveStatus;
}
