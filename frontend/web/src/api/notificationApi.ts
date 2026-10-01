import { api } from './client';
import { API_URL } from '../config/env';

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientType: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationApi = {
  async listNotifications(recipientId: string, page = 1, limit = 20): Promise<NotificationListResponse> {
    try {
      const res = await api.get<{ success: boolean; data: NotificationListResponse }>('/notifications', {
        params: { recipientId, page, limit },
      });
      return res.data.data;
    } catch {
      return { items: [], total: 0, unreadCount: 0, page: 1, limit, totalPages: 1 };
    }
  },

  async getUnreadCount(recipientId: string): Promise<number> {
    try {
      const res = await api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count', {
        params: { recipientId },
      });
      return res.data.data.count;
    } catch {
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(recipientId: string): Promise<void> {
    await api.post(`/notifications/read-all`, null, {
      params: { recipientId },
    });
  },

  getSseStreamUrl(recipientId: string): string {
    return `${API_URL}/notifications/stream?recipientId=${encodeURIComponent(recipientId)}`;
  },
};
