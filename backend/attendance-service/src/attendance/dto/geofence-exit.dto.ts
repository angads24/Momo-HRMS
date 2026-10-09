import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { LocationEventDto } from './location-event.dto';

export class GeofenceExitDto extends LocationEventDto {
  @ApiPropertyOptional({ example: 'LOCATION_OFF' })
  @IsOptional()
  @IsString()
  reason?: string;
}
