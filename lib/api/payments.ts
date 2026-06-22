import { apiClient } from "./client";

const BASE = "/api/v1/payments";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PaymentIntent {
  id: string;
  orderId: string;
  customerId?: string | null;
  amount: string;
  currency: string;
  status: string;
  /** Razorpay order_id returned by the backend after creating the intent. */
  providerRef?: string | null;
  providerPaymentId?: string | null;
  providerSignature?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
}

export interface VerifyResult {
  verified: boolean;
  intentId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const paymentsApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  createIntent(data: { orderId: string | number; amount: number | string; currency?: string }) {
    return apiClient.post<PaymentIntent>(`${BASE}/intents`, {
      orderId: String(data.orderId),
      amount: String(data.amount),
      currency: data.currency,
    });
  },

  getIntent(intentId: string | number) {
    return apiClient.get<PaymentIntent>(`${BASE}/intents/${intentId}`);
  },

  /**
   * Submit the Razorpay checkout handler payload to backend HMAC verification.
   * Backend matches `signature === HMAC_SHA256(key_secret, `${order_id}|${payment_id}`)`
   * and on success flips the intent to `captured`.
   */
  verify(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return apiClient.post<VerifyResult>(`${BASE}/verify`, data);
  },
};
