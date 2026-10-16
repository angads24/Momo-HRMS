export const NOTIFICATION_TYPES = [
  'GEOFENCE_EXIT_WARNING',
  'GEOFENCE_RETURN',
  'CHECKIN_CONFIRMATION',
  'CHECKOUT_CONFIRMATION',
  'EXCEPTION_REQUESTED',
  'EXCEPTION_APPROVED',
  'EXCEPTION_REJECTED',
  'SPECIAL_WORKING_HOURS_REQUEST',
  'SPECIAL_CONDITION_APPROVED',
  'SPECIAL_CONDITION_REJECTED',
  'SYSTEM_ALERT',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationRecipientType = 'EMPLOYEE' | 'USER' | 'BROADCAST' | 'HR' | 'ADMIN';

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientType: NotificationRecipientType;
  recipientDisplay?: string;
  recipientName?: string;
  from?: string;
  to?: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;

  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedNotificationsResponse {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryNotificationsParams {
  recipientId?: string;
  email?: string;
  role?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateNotificationPayload {
  recipientId: string;
  recipientType?: NotificationRecipientType;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;

}
