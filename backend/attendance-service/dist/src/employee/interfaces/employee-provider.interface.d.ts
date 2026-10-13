export interface EmployeeProvider {
    isAssignedToOffice(employeeId: string, officeId: string): Promise<boolean>;
    resolveEmployeeIdentifiers?(employeeId: string): Promise<string[]>;
}
export declare const EMPLOYEE_PROVIDER: unique symbol;
