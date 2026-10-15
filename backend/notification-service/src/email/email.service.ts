import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendSpecialWorkingHoursEmail(options: {
    hrEmail: string;
    employeeName: string;
    employeeId: string;
    employeeEmail?: string;
    attendanceDate: string;
    additionalHours: number;
    reason: string;
    exceptionId: string;
  }): Promise<void> {
    this.logger.log(
      `[SpecialWorkingHoursEmail] Dispatched to ${options.hrEmail} for employee ${options.employeeName} (${options.employeeId}) - ${options.additionalHours}h`,
    );
  }

  async sendDecisionEmail(options: {
    employeeEmail: string;
    employeeName: string;
    status: 'APPROVED' | 'REJECTED';
    attendanceDate: string;
    additionalHours?: number;
    comment?: string;
  }): Promise<void> {
    this.logger.log(
      `[DecisionEmail] Dispatched ${options.status} to ${options.employeeEmail} for ${options.employeeName}`,
    );
  }
}
