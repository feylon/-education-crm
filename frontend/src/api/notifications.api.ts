import { cleanQuery, http, unwrap } from './http';
import type { ListQuery, Notification, Paginated } from './types';

export const notificationsApi = {
  list: (query: ListQuery) => unwrap<Paginated<Notification>>(http.get('/notifications', { params: cleanQuery(query) })),
  unreadCount: () => unwrap<{ count: number }>(http.get('/notifications/unread-count')),
  markRead: (id: string) => unwrap<Notification>(http.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap<{ updated: number }>(http.post('/notifications/read-all')),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/notifications/${id}`)),
  send: (payload: { userIds?: string[]; roles?: string[]; title: string; body: string }) =>
    unwrap<{ sent: number }>(http.post('/notifications/send', payload)),
};
