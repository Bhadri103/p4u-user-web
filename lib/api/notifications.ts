import { apiClient } from "./client";

const BASE = "/api/v1/notifications";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: number;
  title: string;
  body?: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DeviceRegistration {
  id?: number;
  deviceToken?: string;
  token?: string;
  platform: string;
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const notificationsApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  getMyNotifications(params?: { limit?: number; offset?: number }) {
    return apiClient.get<Notification[]>(`${BASE}/me`, params as Record<string, string | number | boolean>);
  },

  markAsRead(notificationId: number) {
    return apiClient.post<void>(`${BASE}/me/${notificationId}/read`);
  },

  registerDevice(deviceToken: string, platform: string) {
    return apiClient.post<DeviceRegistration>(`${BASE}/devices/register`, { deviceToken, platform });
  },
};
