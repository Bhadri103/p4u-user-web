import { apiClient, type PaginatedResponse } from './client';

const BASE = '/api/v1/commerce/food';

export interface FoodRestaurant {
  id: string;
  vendorId: string;
  name: string;
  tagline: string | null;
  description: string | null;
  cuisine: string[] | null;
  vegOnly: boolean;
  coverImage: string | null;
  logoUrl: string | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  avgPrepMinutes: number;
  deliveryRadiusKm: string;
  packagingFee: string;
  minOrderAmount: string;
  status: 'open' | 'closed' | 'busy' | 'offline';
  rating: string;
  reviewsCount: number;
  distanceKm?: number | null;
}

export interface FoodMenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FoodMenuItem {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string;
  discountedPrice: string | null;
  isVeg: boolean;
  imageUrl: string | null;
  addons: Array<Record<string, unknown>> | null;
  customizations: Array<Record<string, unknown>> | null;
  inStock: boolean;
  isBestseller: boolean;
  prepMinutes: number;
  gstRate: string;
}

export interface FoodCombo {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  item_ids: string[];
  price: string;
  image_url: string | null;
  in_stock: boolean;
}
export interface FoodOrderLine {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  gst: number;
  addons: Array<{ id: string; name: string; price: number }>;
  customizations: Record<string, unknown>;
  isVeg: boolean;
}

export interface FoodOrder {
  id: string;
  orderRef: string;
  customerId: string;
  restaurantId: string;
  restaurantName: string;
  items: FoodOrderLine[];
  subtotal: string;
  packagingFee: string;
  deliveryFee: string;
  riderTip: string;
  gst: string;
  platformFee: string;
  discount: string;
  total: string;
  deliveryAddress: string;
  distanceKm: string | null;
  etaMinutes: number | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  placedAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface FoodOrderChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'customer' | 'vendor' | 'rider';
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface FoodOrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface FoodReview {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  foodRating: number;
  deliveryRating: number | null;
  comment: string | null;
  imageUrls: string[] | null;
  createdAt: string;
}

export interface PlaceFoodOrderInput {
  restaurantId: string;
  items: Array<{
    menuItemId?: string;
    comboId?: string;
    quantity: number;
    addonIds?: string[];
    customizations?: Record<string, unknown>;
  }>;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  riderTip?: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  scheduledFor?: string;
  couponCode?: string;
}

export const foodApi = {
  listRestaurants(params?: { search?: string; cuisine?: string; vegOnly?: boolean; lat?: number; lng?: number }) {
    const query: Record<string, string | number | boolean> = {};
    if (params?.search) query.search = params.search;
    if (params?.cuisine) query.cuisine = params.cuisine;
    if (params?.vegOnly != null) query.vegOnly = params.vegOnly;
    if (params?.lat != null) query.lat = params.lat;
    if (params?.lng != null) query.lng = params.lng;
    return apiClient.get<FoodRestaurant[]>(`${BASE}/restaurants`, query, { cacheTtlMs: 20_000 });
  },

  getRestaurant(restaurantId: string) {
    return apiClient.get<FoodRestaurant>(`${BASE}/restaurants/${encodeURIComponent(restaurantId)}`);
  },

  getMenu(restaurantId: string) {
    return apiClient.get<{ restaurant: FoodRestaurant; categories: FoodMenuCategory[]; items: FoodMenuItem[] }>(
      `${BASE}/restaurants/${encodeURIComponent(restaurantId)}/menu`,
    );
  },

  listCombos(restaurantId: string) {
    return apiClient.get<FoodCombo[]>(`${BASE}/restaurants/${encodeURIComponent(restaurantId)}/combos`);
  },
  listReviews(restaurantId: string, params?: { limit?: number; offset?: number }) {
    return apiClient.get<PaginatedResponse<FoodReview>>(
      `${BASE}/restaurants/${encodeURIComponent(restaurantId)}/reviews`,
      params,
    );
  },

  placeOrder(input: PlaceFoodOrderInput) {
    return apiClient.post<FoodOrder>(`${BASE}/orders`, input);
  },

  listOrders(params?: { limit?: number; offset?: number }) {
    return apiClient.get<PaginatedResponse<FoodOrder>>(`${BASE}/orders`, params);
  },

  getOrder(orderId: string) {
    return apiClient.get<FoodOrder>(`${BASE}/orders/${encodeURIComponent(orderId)}`);
  },

  cancelOrder(orderId: string, reason: string) {
    return apiClient.post<FoodOrder>(`${BASE}/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
  },

  listChat(orderId: string) {
    return apiClient.get<FoodOrderChatMessage[]>(`${BASE}/orders/${encodeURIComponent(orderId)}/chat`, undefined, {
      forceRefresh: true,
      cacheTtlMs: 0,
    });
  },

  listOrderHistory(orderId: string) {
    return apiClient.get<FoodOrderStatusHistory[]>(
      `${BASE}/orders/${encodeURIComponent(orderId)}/history`,
      undefined,
      { forceRefresh: true, cacheTtlMs: 0 },
    );
  },

  sendChat(orderId: string, message: string) {
    return apiClient.post<FoodOrderChatMessage>(`${BASE}/orders/${encodeURIComponent(orderId)}/chat`, { message });
  },

  validateCoupon(input: { code: string; restaurantId: string; subtotal: number }) {
    return apiClient.post<{ id: string; code: string; title: string; discount: number }>(`${BASE}/coupons/validate`, input);
  },

  createPayment(orderId: string, provider = "razorpay") {
    return apiClient.post<{ id: string; providerOrderId: string; amount: number; currency: string }>(`${BASE}/orders/${encodeURIComponent(orderId)}/payment`, { provider });
  },

  trackOrder(orderId: string) {
    return apiClient.get<Record<string, unknown>>(`${BASE}/orders/${encodeURIComponent(orderId)}/tracking`, undefined, { forceRefresh: true, cacheTtlMs: 0 });
  },

  getInvoice(orderId: string) {
    return apiClient.get<Record<string, unknown>>(`${BASE}/orders/${encodeURIComponent(orderId)}/invoice`);
  },

  subscribeBackInStock(itemId: string) {
    return apiClient.post(`${BASE}/menu/items/${encodeURIComponent(itemId)}/back-in-stock`, {});
  },
  reviewOrder(orderId: string, input: { foodRating: number; deliveryRating?: number; comment?: string; imageUrls?: string[] }) {
    return apiClient.post(`${BASE}/orders/${encodeURIComponent(orderId)}/review`, input);
  },
};
