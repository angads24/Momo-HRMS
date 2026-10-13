import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { AttendancePolicy, AttendancePolicyProvider } from '../interfaces/attendance-policy-provider.interface';
export declare class ConfigAttendancePolicyProvider implements AttendancePolicyProvider {
    private readonly configService;
    constructor(configService: ConfigService<AppConfig, true>);
    getPolicy(_officeId: string): Promise<AttendancePolicy>;
}
