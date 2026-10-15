export declare const NOTIFICATION_TYPES: readonly ["GEOFENCE_EXIT_WARNING", "GEOFENCE_RETURN", "CHECKIN_CONFIRMATION", "CHECKOUT_CONFIRMATION", "EXCEPTION_REQUESTED", "EXCEPTION_APPROVED", "EXCEPTION_REJECTED", "SYSTEM_ALERT", "SPECIAL_WORKING_HOURS_REQUEST", "SPECIAL_CONDITION_APPROVED", "SPECIAL_CONDITION_REJECTED"];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export declare class CreateNotificationDto {
    recipientId: string;
    recipientType?: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, any>;
}
