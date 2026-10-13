export { AttendanceStatus, CheckInStatus, CheckoutType, CheckoutReason, PauseEndReason, AttendanceEventType, AttendanceEventSource, } from '@prisma/client';
export declare enum SyncResultStatus {
    PROCESSED = "PROCESSED",
    ALREADY_PROCESSED = "ALREADY_PROCESSED",
    REJECTED = "REJECTED",
    INVALID_STATE = "INVALID_STATE"
}
