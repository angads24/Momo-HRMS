import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExceptionsService } from '../services/exceptions.service';
import { CreateExceptionDto } from '../dto/create-exception.dto';
import { ApproveExceptionDto } from '../dto/approve-exception.dto';
import { ApiMessage } from '../../common/decorators/api-message.decorator';
import { CurrentEmployee } from '../../common/decorators/current-employee.decorator';
import { EmployeeAuthContext } from '../../common/interfaces/employee-auth-context.interface';
import { ExceptionStatus } from '@prisma/client';

@ApiTags('attendance-exceptions')
@Controller('attendance/exceptions')
export class ExceptionsController {
  constructor(private readonly exceptionsService: ExceptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiMessage('Attendance exception requested successfully')
  async createException(@Body() dto: CreateExceptionDto) {
    return this.exceptionsService.createException(dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiMessage('Attendance exception decision recorded')
  async approveException(
    @CurrentEmployee() auth: EmployeeAuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveExceptionDto,
  ) {
    return this.exceptionsService.approveException(id, auth.userId, dto);
  }

  @Get()
  async listExceptions(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: ExceptionStatus,
  ) {
    return this.exceptionsService.getExceptions(employeeId, status);
  }
}
