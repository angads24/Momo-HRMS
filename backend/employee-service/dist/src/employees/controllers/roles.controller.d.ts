import { OrganizationService } from '../services/organization.service';
export declare class RolesController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    listRoles(): Promise<{
        id: string;
        name: string;
        description: string;
        employeeCount: number;
    }[]>;
}
