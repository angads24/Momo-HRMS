import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppConfig } from '../../config/configuration';
import { AttendanceService } from '../services/attendance.service';
export declare class AutoCheckoutScheduler {
    private readonly attendanceService;
    private readonly configService;
    private readonly schedulerRegistry;
    private readonly logger;
    constructor(attendanceService: AttendanceService, configService: ConfigService<AppConfig, true>, schedulerRegistry: SchedulerRegistry);
    private runSweep;
}
