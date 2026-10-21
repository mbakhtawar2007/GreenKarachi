import { apiFetch } from './catalog';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  ref_type: string | null;
  ref_id: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationList = {
  notifications: AppNotification[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  unreadCount: number;
};

export const getMyNotifications = (token: string, page = 1, unreadOnly = false): Promise<NotificationList> => {
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (unreadOnly) query.set('unreadOnly', 'true');
  return apiFetch<NotificationList>(`/api/notifications/mine?${query.toString()}`, token);
};

export const getUnreadNotificationCount = (token: string): Promise<{ unreadCount: number }> =>
  apiFetch<{ unreadCount: number }>('/api/notifications/unread-count', token);

export const markNotificationRead = (token: string, notificationId: string): Promise<{ notification: AppNotification }> =>
  apiFetch<{ notification: AppNotification }>(`/api/notifications/${notificationId}/read`, token, { method: 'PATCH' });

export const markAllNotificationsRead = (token: string): Promise<{ updated: number }> =>
  apiFetch<{ updated: number }>('/api/notifications/read-all', token, { method: 'POST' });
