import { EmployeeProvider } from '../interfaces/employee-provider.interface';
export declare class MockEmployeeProvider implements EmployeeProvider {
    private readonly deniedPairs;
    denyAssignment(employeeId: string, officeId: string): void;
    isAssignedToOffice(employeeId: string, officeId: string): Promise<boolean>;
    resolveEmployeeIdentifiers(employeeId: string): Promise<string[]>;
}
