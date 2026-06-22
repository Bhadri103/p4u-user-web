import { apiClient } from "./client";

const BASE = "/api/v1/vendor";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface VendorProfile {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
}

export interface VendorOrder {
  id: string;
  customerId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface VendorReview {
  id: number;
  orderId: number;
  rating: number;
  comment?: string;
  customerName?: string;
  createdAt: string;
}

export interface VendorRegistrationStatus {
  status: "pending" | "approved" | "rejected";
  vendorId?: number;
  submittedAt: string;
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const vendorApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  // Profile
  getMe() {
    return apiClient.get<VendorProfile>(`${BASE}/me`);
  },

  updateMe(data: Partial<VendorProfile>) {
    return apiClient.patch<VendorProfile>(`${BASE}/me`, data);
  },

  // Orders — backend returns { items, total, limit, offset } in envelope data
  getOrders(params?: { limit?: number; offset?: number; status?: string }) {
    return apiClient
      .get<{ items?: VendorOrder[]; total?: number; limit?: number; offset?: number }>(
        `${BASE}/orders`,
        params as Record<string, string | number | boolean>,
      )
      .then((payload) => ({
        data: payload.items ?? [],
        total: payload.total ?? (payload.items?.length ?? 0),
        limit: payload.limit ?? 20,
        offset: payload.offset ?? 0,
      }));
  },

  getOrder(orderId: string | number) {
    return apiClient.get<VendorOrder>(`${BASE}/orders/${orderId}`);
  },

  updateOrderStatus(orderId: string | number, status: string) {
    return apiClient.patch<VendorOrder>(`${BASE}/orders/${orderId}`, { status });
  },

  // Reviews — GET /vendor/reviews/by-order/:orderId
  getReviewsByOrder(orderId: string | number) {
    return apiClient
      .get<{ orderId?: string; items?: VendorReview[] }>(`${BASE}/reviews/by-order/${orderId}`)
      .then((body) => body.items ?? []);
  },

  // Registration (CUSTOMER role)
  register(data: { businessName: string; description?: string; phone: string }) {
    return apiClient.post<{ message: string }>(`${BASE}/register`, data);
  },

  getRegistrationStatus() {
    return apiClient.get<VendorRegistrationStatus>(`${BASE}/register/status`);
  },
};
