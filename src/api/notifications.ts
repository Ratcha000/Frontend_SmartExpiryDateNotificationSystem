import apiClient from './client';
import type { AppNotification } from '../types';

/**
 * GET /api/notifications
 * notification ของ user ที่ login อยู่ (scheduler สร้างให้ Manager ตอนถึงวัน/เวลาซื้อของ)
 */
export const getNotifications = () => apiClient.get<AppNotification[]>('/notifications');

/** PATCH /api/notifications/{id}/read */
export const markNotificationRead = (id: string) =>
  apiClient.patch(`/notifications/${id}/read`);
