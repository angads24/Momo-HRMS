import { AttendanceStatus } from '../enums';
export interface SessionForDurationCalc {
    status: AttendanceStatus;
    checkInAt: Date;
    checkOutAt: Date | null;
    currentPauseStartedAt: Date | null;
}
export interface PauseForDurationCalc {
    startedAt: Date;
    endedAt: Date | null;
}
export declare class WorkingTimeService {
    calculateWorkingSeconds(session: SessionForDurationCalc, pauses?: PauseForDurationCalc[], now?: Date): number;
    private resolveReferenceEnd;
    private sumPauseSeconds;
}
