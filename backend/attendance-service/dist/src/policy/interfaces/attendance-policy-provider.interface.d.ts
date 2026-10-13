export interface AttendancePolicy {
    checkInStartTime: string;
    checkInEndTime: string;
    lateCutoffTime: string;
    lateThresholdMinutes: number;
    gracePeriodMinutes: number;
    autoCheckoutEnabled: boolean;
    autoCheckoutTime: string;
    workingHoursPerDay: number;
    allowManualCheckoutWhilePaused: boolean;
    minLocationAccuracyMeters: number;
}
export interface AttendancePolicyProvider {
    getPolicy(officeId: string): Promise<AttendancePolicy>;
}
export declare const ATTENDANCE_POLICY_PROVIDER: unique symbol;
