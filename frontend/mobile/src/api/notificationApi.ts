import { notificationClient } from './client';

export type NotificationType =
  | 'CHECK_IN_SUCCESS'
  | 'CHECK_OUT_SUCCESS'
  | 'AUTO_CHECKOUT'
  | 'REMINDER'
  | 'LATE_CHECKIN'
  | 'OUTSIDE_OFFICE'
  | 'ATTENDANCE_ISSUE'
  | 'LEAVE'
  | 'PROFILE_UPDATE'
  | 'SYSTEM'
  | string;

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientType?: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface GetNotificationsParams {
  recipientId?: string;
  email?: string;
  role?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

type UnreadCountListener = (count: number) => void;
const unreadListeners = new Set<UnreadCountListener>();
let currentUnreadCount = 0;
let lastOptimisticUpdateTimestamp = 0;

export function getCachedUnreadCount(): number {
  return currentUnreadCount;
}

export function getLastOptimisticUpdateTimestamp(): number {
  return lastOptimisticUpdateTimestamp;
}

export function setGlobalUnreadCount(count: number, isOptimistic = true): void {
  const normalized = Math.max(0, count);
  currentUnreadCount = normalized;
  if (isOptimistic) {
    lastOptimisticUpdateTimestamp = Date.now();
  }
  unreadListeners.forEach((listener) => {
    try {
      listener(normalized);
    } catch {
      // ignore
    }
  });
}

export function subscribeUnreadCount(listener: UnreadCountListener): () => void {
  unreadListeners.add(listener);
  listener(currentUnreadCount);
  return () => {
    unreadListeners.delete(listener);
  };
}

export async function getNotifications(params: GetNotificationsParams = {}): Promise<NotificationListResponse> {
  const { data } = await notificationClient.get<NotificationListResponse>('/notifications', {
    params,
  });
  return data;
}

export interface GetUnreadNotificationCountParams {
  recipientId?: string;
  email?: string;
  role?: string;
  userId?: string;
}

export async function getUnreadNotificationCount(
  params?: GetUnreadNotificationCountParams | string,
): Promise<number> {
  const queryParams = typeof params === 'string' ? { recipientId: params } : (params || {});
  if (!queryParams.recipientId && !queryParams.email && !queryParams.userId) return 0;
  try {
    const { data } = await notificationClient.get<{ count?: number; unreadCount?: number }>('/notifications/unread-count', {
      params: queryParams,
    });
    const serverCount = data?.count ?? data?.unreadCount ?? 0;
    // Guard against race conditions: if user recently read notifications (optimistic decrement within 3s),
    // don't let a stale server write overwrite a smaller count.
    if (Date.now() - lastOptimisticUpdateTimestamp < 3000 && serverCount > currentUnreadCount) {
      return currentUnreadCount;
    }
    setGlobalUnreadCount(serverCount, false);
    return serverCount;
  } catch {
    return currentUnreadCount;
  }
}

export async function markNotificationAsRead(
  id: string,
  params?: { recipientId?: string; email?: string; userId?: string } | string,
): Promise<AppNotification> {
  const payload = typeof params === 'string' ? { recipientId: params } : (params || {});
  const { data } = await notificationClient.patch<AppNotification>(`/notifications/${id}/read`, payload, {
    params: payload,
  });
  return data;
}

export async function markAllNotificationsAsRead(
  params?: { recipientId?: string; email?: string; role?: string; userId?: string } | string,
): Promise<{ count?: number; updated?: number }> {
  const payload = typeof params === 'string' ? { recipientId: params } : (params || {});
  const { data } = await notificationClient.post<any>('/notifications/read-all', payload, {
    params: payload,
  });
  return data;
}
