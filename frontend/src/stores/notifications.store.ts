import { notificationsApi } from '@/api/notifications.api';
import { tokenStorage } from '@/api/http';
import type { Notification } from '@/api/types';
import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { ref } from 'vue';

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);
  const latest = ref<Notification[]>([]);
  const incoming = ref<Notification | null>(null);
  let socket: Socket | null = null;

  const loadUnread = async (): Promise<void> => {
    const result = await notificationsApi.unreadCount();
    unreadCount.value = result.count;
  };

  const loadLatest = async (): Promise<void> => {
    const result = await notificationsApi.list({ page: 1, limit: 8 });
    latest.value = result.items;
  };

  const markRead = async (id: string): Promise<void> => {
    await notificationsApi.markRead(id);
    latest.value = latest.value.map((item) => (item.id === id ? { ...item, isRead: true } : item));
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  };

  const markAllRead = async (): Promise<void> => {
    await notificationsApi.markAllRead();
    latest.value = latest.value.map((item) => ({ ...item, isRead: true }));
    unreadCount.value = 0;
  };

  const connect = (): void => {
    const token = tokenStorage.access;
    if (socket || !token) {
      return;
    }
    socket = io(import.meta.env.VITE_WS_URL || '/', { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('notification', (notification: Notification) => {
      unreadCount.value += 1;
      latest.value = [notification, ...latest.value].slice(0, 8);
      incoming.value = notification;
    });
    socket.on('unauthorized', () => disconnect());
  };

  const disconnect = (): void => {
    socket?.disconnect();
    socket = null;
    unreadCount.value = 0;
    latest.value = [];
  };

  return { unreadCount, latest, incoming, loadUnread, loadLatest, markRead, markAllRead, connect, disconnect };
});
