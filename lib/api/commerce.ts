import { apiClient, PaginatedResponse } from "./client";

const BASE = "/api/v1/commerce";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CartItemApi {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  unitPrice?: string;
  /** Some responses expose a numeric price alias */
  price?: number;
  quantity: number;
  vendorId?: string | null;
  lineTotal?: string;
  /** Snapshot fields (product image, name, vendor) from cart / checkout */
  metadata?: Record<string, unknown> | null;
}

export interface Cart {
  id: number | string;
  items: CartItemApi[];
  totalAmount?: number;
  subtotal?: string;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  price: number;
}

/** Matches commerce-management-service POST /checkout/quote response */
export interface CheckoutQuote {
  itemTotal: number;
  platformFee: number;
  discount: number;
  total: number;
  currency?: string;
}

/** Full cart pricing breakdown returned by POST /commerce/cart/quote (pricing engine v2). */
export interface CartQuoteBreakdown {
  cartId: string;
  currency: "INR";
  itemSubtotal: string;
  discount: string;
  pointsRedeemed: number;
  pointsRedeemedValue: string;
  platformFee: string;
  gstOnPlatformFee: string;
  gstOnPlatformFeePercent: string;
  deliveryFee: string;
  surgeCost: string;
  productTax: string;
  grandTotal: string;
  minCartValue: string;
  meetsMinCart: boolean;
  maxRedeemableValue: string;
  maxRedeemablePercent: string;
  walletBalanceBefore: number;
  lines: Array<{
    productId: string;
    vendorId: string | null;
    categoryId: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    commissionPercent: string;
    commissionAmount: string;
    source: string;
  }>;
  vendors: Array<{
    vendorId: string | null;
    vendorName: string | null;
    subtotal: string;
    commissionTotal: string;
    netToVendor: string;
  }>;
  warnings: string[];
}

export interface CouponValidation {
  valid: boolean;
  discount?: number;
  message?: string;
  couponId?: string;
}

/** Normalized for UI; backend uses bookingDate / timeSlot and uuid id */
export interface Booking {
  id: string;
  customerId?: string;
  vendorId: string;
  serviceId?: string | null;
  bookingDate: string;
  timeSlot: string;
  status: string;
  createdAt: string;
  /** Aliases for simple screens */
  date: string;
  slot: string;
}

export interface AvailableSlot {
  label: string;
  value: string;
  available: boolean;
}

export interface Review {
  id: string | number;
  targetType: string;
  targetId: string | number;
  rating: number;
  comment?: string;
  userId: number;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
}

function normalizeBooking(row: Record<string, unknown>): Booking {
  const bookingDate = String(row.bookingDate ?? row.booking_date ?? "");
  const timeSlot = String(row.timeSlot ?? row.time_slot ?? "");
  const id = String(row.id ?? "");
  return {
    id,
    customerId: row.customerId != null ? String(row.customerId) : undefined,
    vendorId: String(row.vendorId ?? row.vendor_id ?? ""),
    serviceId: (row.serviceId ?? row.service_id) as string | null | undefined,
    bookingDate,
    timeSlot,
    status: String(row.status ?? ""),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    date: bookingDate,
    slot: timeSlot,
  };
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const commerceApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  // Cart
  getCart() {
    return apiClient.get<Cart>(`${BASE}/cart`);
  },

  updateCart(
    items: {
      productId: string | number;
      quantity: number;
      unitPrice?: number;
      vendorId?: string | null;
      metadata?: Record<string, unknown> | null;
    }[],
  ) {
    return apiClient.put<Cart>(`${BASE}/cart`, {
      items: items.map((i) => ({
        productId: String(i.productId),
        quantity: i.quantity,
        ...(i.unitPrice != null ? { unitPrice: i.unitPrice } : {}),
        ...(i.vendorId != null && i.vendorId !== "" ? { vendorId: i.vendorId } : {}),
        ...(i.metadata != null && Object.keys(i.metadata).length ? { metadata: i.metadata } : {}),
      })),
    });
  },

  addCartItem(
    productId: string | number,
    quantity = 1,
    unitPrice?: number,
    vendorId?: string | null,
    metadata?: Record<string, unknown> | null,
  ) {
    return apiClient.post<Cart>(`${BASE}/cart/items`, {
      productId: String(productId),
      quantity,
      ...(unitPrice != null ? { unitPrice } : {}),
      ...(vendorId != null && vendorId !== "" ? { vendorId } : {}),
      ...(metadata != null && Object.keys(metadata).length ? { metadata } : {}),
    });
  },

  updateCartItem(itemId: string | number, quantity: number) {
    return apiClient.patch<Cart>(`${BASE}/cart/items/${encodeURIComponent(String(itemId))}`, { quantity });
  },

  removeCartItem(itemId: string | number) {
    return apiClient.delete<Cart>(`${BASE}/cart/items/${encodeURIComponent(String(itemId))}`);
  },

  clearCart() {
    return apiClient.delete<void>(`${BASE}/cart`);
  },

  mergeCart(items: { productId: string | number; quantity: number; unitPrice?: number; vendorId?: string | null }[]) {
    return apiClient.post<Cart>(`${BASE}/cart/merge`, {
      items: items.map((i) => ({
        productId: String(i.productId),
        quantity: i.quantity,
        ...(i.unitPrice != null ? { unitPrice: i.unitPrice } : {}),
        ...(i.vendorId != null && i.vendorId !== "" ? { vendorId: i.vendorId } : {}),
      })),
    });
  },

  /** Pre-checkout pricing engine: returns full breakdown (fees, commission, redemption cap). */
  quoteCart(opts: { redeemPoints?: number } = {}) {
    return apiClient.post<CartQuoteBreakdown>(`${BASE}/cart/quote`, {
      redeemPoints: opts.redeemPoints ?? 0,
    });
  },

  // Orders
  createOrderFromCart(opts: { redeemPoints?: number; vendorId?: string } = {}) {
    return apiClient.post<Order>(`${BASE}/orders/from-cart`, {
      ...(opts.redeemPoints != null ? { redeemPoints: opts.redeemPoints } : {}),
      ...(opts.vendorId ? { vendorId: opts.vendorId } : {}),
    });
  },

  createOrder(data: { items: { productId: number; quantity: number; price: number }[]; addressId?: number }) {
    return apiClient.post<Order>(`${BASE}/orders`, data);
  },

  getOrders(customerId: string | number, params?: { limit?: number; offset?: number }) {
    return apiClient.get<PaginatedResponse<Order>>(`${BASE}/customers/${customerId}/orders`, params as Record<string, string | number | boolean>);
  },

  getOrder(orderId: string | number) {
    return apiClient.get<Order>(`${BASE}/orders/${orderId}`);
  },

  cancelOrder(orderId: string | number) {
    return apiClient.post<Order>(`${BASE}/orders/${orderId}/cancel`);
  },

  // Checkout — backend expects itemTotal, platformFee, discount (see commerce.routes.ts)
  getCheckoutQuote(data: { itemTotal: number; platformFee?: number; discount?: number }) {
    const itemTotal = data.itemTotal;
    const platformFee = data.platformFee ?? 0;
    const discount = data.discount ?? 0;
    return apiClient.post<CheckoutQuote>(`${BASE}/checkout/quote`, {
      itemTotal,
      platformFee,
      discount,
    });
  },

  validateCoupon(code: string, cartTotal: number, vendorId?: string) {
    return apiClient.post<CouponValidation>(`${BASE}/coupons/validate`, {
      code,
      cartTotal,
      ...(vendorId !== undefined ? { vendorId } : {}),
    });
  },

  // Bookings — backend expects bookingDate, timeSlot
  createBooking(data: {
    vendorId: string | number;
    serviceId?: string | number | null;
    date: string;
    slot: string;
    addressId?: string | null;
    notes?: string | null;
    totalAmount?: string;
  }) {
    return apiClient
      .post<Record<string, unknown>>(`${BASE}/bookings`, {
        vendorId: data.vendorId,
        serviceId: data.serviceId ?? null,
        bookingDate: data.date,
        timeSlot: data.slot,
        addressId: data.addressId ?? null,
        notes: data.notes ?? null,
        totalAmount: data.totalAmount ?? "0",
      })
      .then((row) => normalizeBooking(row as Record<string, unknown>));
  },

  getBookings(params?: { limit?: number; offset?: number }) {
    return apiClient
      .get<{ items?: Record<string, unknown>[]; total?: number; limit?: number; offset?: number }>(
        `${BASE}/bookings`,
        params as Record<string, string | number | boolean>,
      )
      .then((payload) => {
        const items = (payload.items ?? []).map((row) => normalizeBooking(row));
        return {
          data: items,
          total: payload.total ?? items.length,
          limit: payload.limit ?? 20,
          offset: payload.offset ?? 0,
        } satisfies PaginatedResponse<Booking>;
      });
  },

  getVendorBookings(params?: { limit?: number; offset?: number; status?: string }) {
    return apiClient
      .get<{ items?: Record<string, unknown>[]; total?: number; limit?: number; offset?: number }>(
        `${BASE}/bookings/vendor`,
        params as Record<string, string | number | boolean>,
      )
      .then((payload) => {
        const items = (payload.items ?? []).map((row) => normalizeBooking(row));
        return {
          data: items,
          total: payload.total ?? items.length,
          limit: payload.limit ?? 20,
          offset: payload.offset ?? 0,
        } satisfies PaginatedResponse<Booking>;
      });
  },

  updateBookingStatus(bookingId: string | number, status: "approved" | "rejected") {
    return apiClient
      .patch<Record<string, unknown>>(`${BASE}/bookings/${bookingId}/status`, { status })
      .then((row) => normalizeBooking(row));
  },

  getBooking(bookingId: string | number) {
    return apiClient.get<Record<string, unknown>>(`${BASE}/bookings/${bookingId}`).then((row) => normalizeBooking(row));
  },

  cancelBooking(bookingId: string | number) {
    return apiClient.post<Record<string, unknown>>(`${BASE}/bookings/${bookingId}/cancel`).then((row) => normalizeBooking(row));
  },

  getAvailableSlots(vendorId: string | number, date: string, serviceId?: string | null) {
    const params: Record<string, string> = { vendorId: String(vendorId), date };
    const sid = serviceId != null ? String(serviceId).trim() : "";
    if (sid) params.serviceId = sid;
    return apiClient
      .get<{
        vendorId?: string;
        date?: string;
        slots?: AvailableSlot[];
      } | AvailableSlot[]>(`${BASE}/bookings/available-slots`, params)
      .then((body) => {
        if (Array.isArray(body)) return body;
        if (body && typeof body === "object" && Array.isArray(body.slots)) return body.slots;
        return [];
      });
  },

  // Reviews
  createReview(data: { targetType: string; targetId: string | number; rating: number; comment?: string }) {
    return apiClient.post<Review>(`${BASE}/reviews`, {
      targetType: data.targetType,
      targetId: data.targetId,
      rating: data.rating,
      reviewText: data.comment,
    });
  },

  getReviews(targetType: string, targetId: string | number) {
    return apiClient
      .get<
        | { items?: Array<Review & { reviewText?: string | null }>; data?: Array<Review & { reviewText?: string | null }> }
        | Array<Review & { reviewText?: string | null }>
      >(`${BASE}/reviews`, { targetType, targetId })
      .then((payload) => {
        const rows = Array.isArray(payload)
          ? payload
          : (payload.items ?? payload.data ?? []);
        return rows.map((row) => ({
          ...row,
          comment: row.comment ?? row.reviewText ?? undefined,
        }));
      });
  },

  getReviewSummary(targetType: string, targetId: string | number) {
    return apiClient
      .get<{ average?: number; count?: number }>(`${BASE}/reviews/summary`, { targetType, targetId })
      .then((raw) => ({
        averageRating: raw.average ?? 0,
        totalReviews: raw.count ?? 0,
        breakdown: {} as Record<number, number>,
      }));
  },
};
