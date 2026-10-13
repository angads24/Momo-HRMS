import { ConfigService } from '@nestjs/config';
import { EmployeeProvider } from '../interfaces/employee-provider.interface';
import { MockEmployeeProvider } from './mock-employee.provider';
export declare class HttpEmployeeProvider implements EmployeeProvider {
    private readonly configService;
    private readonly mockProvider;
    private readonly logger;
    private readonly employeeServiceUrl;
    constructor(configService: ConfigService, mockProvider: MockEmployeeProvider);
    private readonly idCache;
    resolveEmployeeIdentifiers(employeeId: string): Promise<string[]>;
    isAssignedToOffice(employeeId: string, officeId: string): Promise<boolean>;
}
