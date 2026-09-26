import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeProvider } from '../interfaces/employee-provider.interface';
import { MockEmployeeProvider } from './mock-employee.provider';

@Injectable()
export class HttpEmployeeProvider implements EmployeeProvider {
  private readonly logger = new Logger(HttpEmployeeProvider.name);
  private readonly employeeServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockEmployeeProvider,
  ) {
    this.employeeServiceUrl = this.configService.get<string>(
      'EMPLOYEE_SERVICE_URL',
      'http://localhost:3004/api/v1',
    );
  }

  async isAssignedToOffice(employeeId: string, officeId: string): Promise<boolean> {
    const isMock = this.configService.get<string>('EMPLOYEE_USE_MOCK', 'false') === 'true';
    if (isMock) {
      return this.mockProvider.isAssignedToOffice(employeeId, officeId);
    }

    try {
      const response = await fetch(
        `${this.employeeServiceUrl}/employees/${encodeURIComponent(employeeId)}/assignment-check?officeId=${encodeURIComponent(officeId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-gateway-secret': this.configService.get<string>('GATEWAY_SHARED_SECRET', 'dev-gateway-secret'),
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.warn(`Employee ${employeeId} not found in Employee Service; failing closed.`);
          return false;
        }
        this.logger.error(`Employee service returned status ${response.status}; falling back to mock provider.`);
        return this.mockProvider.isAssignedToOffice(employeeId, officeId);
      }

      const body = (await response.json()) as { success: boolean; data?: { isAssigned: boolean } };
      return body.data?.isAssigned ?? false;
    } catch (error) {
      this.logger.warn(
        `Failed to reach Employee Service at ${this.employeeServiceUrl} (${(error as Error).message}); falling back to mock provider.`,
      );
      return this.mockProvider.isAssignedToOffice(employeeId, officeId);
    }
  }
}
