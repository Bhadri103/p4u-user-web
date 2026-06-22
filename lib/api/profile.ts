import { apiClient } from "./client";

const BASE = "/api/v1/profile";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: string;
  /** Normalized from API `fullName` */
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  keycloakUserId?: string;
  dob?: string;
  gender?: string;
}

export interface Address {
  id: string | number;
  label?: string;
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault: boolean;
}

export interface WishlistItem {
  id: string | number;
  productId: string | number;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  createdAt: string;
}

export interface ReferralInfo {
  code: string;
  referrals: { id: number; name?: string; joinedAt: string }[];
}

export interface RewardPointsHistoryEntry {
  id: string;
  points: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface RewardPoints {
  balance: number;
  recentHistory?: RewardPointsHistoryEntry[];
  totalEntries?: number;
  /** Legacy alias kept for older callers — empty when the backend only returns recentHistory. */
  history?: { id: number; points: number; reason: string; createdAt: string }[];
}

interface BackendAddress {
  id: string;
  label?: string;
  fullName?: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

function mapCustomerRow(row: Record<string, unknown>): UserProfile {
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const id = row.id != null ? String(row.id) : "";
  const fullName = row.fullName ?? row.full_name;
  const name =
    typeof fullName === "string" && fullName.trim()
      ? fullName.trim()
      : typeof row.name === "string"
        ? row.name
        : "";
  return {
    id,
    name,
    email: typeof row.email === "string" ? row.email : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    keycloakUserId:
      typeof row.keycloakUserId === "string"
        ? row.keycloakUserId
        : typeof row.keycloak_user_id === "string"
          ? row.keycloak_user_id
          : undefined,
    dob: typeof meta.dob === "string" ? meta.dob : undefined,
    gender: typeof meta.gender === "string" ? meta.gender : undefined,
  };
}

function toAddress(row: BackendAddress): Address {
  return {
    id: row.id,
    label: row.label,
    fullName: row.fullName,
    phone: row.phone ?? undefined,
    line1: row.addressLine1,
    line2: row.addressLine2 ?? undefined,
    city: row.city,
    state: row.state,
    pincode: row.postalCode,
    country: row.country,
    isDefault: !!row.isDefault,
  };
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const profileApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  getMe() {
    return apiClient.get<Record<string, unknown>>(`${BASE}/me`).then(mapCustomerRow);
  },

  updateMe(data: Partial<UserProfile> & { dob?: string; gender?: string }) {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.fullName = data.name;
    if (data.email !== undefined) body.email = data.email;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.dob !== undefined) body.dob = data.dob;
    if (data.gender !== undefined) body.gender = data.gender;
    return apiClient.patch<Record<string, unknown>>(`${BASE}/me`, body).then(mapCustomerRow);
  },

  getCustomer(customerId: string | number) {
    return apiClient
      .get<Record<string, unknown>>(`${BASE}/customers/${encodeURIComponent(String(customerId))}`)
      .then(mapCustomerRow);
  },

  // Addresses
  getAddresses() {
    return apiClient
      .get<{ items?: BackendAddress[] } | BackendAddress[]>(`${BASE}/me/addresses`)
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
        return items.map(toAddress);
      });
  },

  createAddress(data: Omit<Address, "id">) {
    const body = {
      label: data.label ?? "Home",
      fullName: data.fullName?.trim() || "Customer",
      phone: data.phone?.trim() || null,
      addressLine1: data.line1,
      addressLine2: data.line2 ?? null,
      city: data.city,
      state: data.state,
      postalCode: data.pincode,
      country: data.country ?? "India",
      isDefault: data.isDefault ?? false,
    };
    return apiClient
      .post<BackendAddress>(`${BASE}/me/addresses`, body)
      .then(toAddress);
  },

  updateAddress(addressId: string | number, data: Partial<Address>) {
    const mapped: Record<string, unknown> = {};
    if (data.label !== undefined) mapped.label = data.label;
    if (data.fullName !== undefined) mapped.fullName = data.fullName;
    if (data.phone !== undefined) mapped.phone = data.phone || null;
    if (data.line1 !== undefined) mapped.addressLine1 = data.line1;
    if (data.line2 !== undefined) mapped.addressLine2 = data.line2;
    if (data.city !== undefined) mapped.city = data.city;
    if (data.state !== undefined) mapped.state = data.state;
    if (data.pincode !== undefined) mapped.postalCode = data.pincode;
    if (data.country !== undefined) mapped.country = data.country;
    if (data.isDefault !== undefined) mapped.isDefault = data.isDefault;
    return apiClient
      .put<BackendAddress>(`${BASE}/me/addresses/${addressId}`, mapped)
      .then(toAddress);
  },

  deleteAddress(addressId: string | number) {
    return apiClient.delete<void>(`${BASE}/me/addresses/${addressId}`);
  },

  // Wishlist
  getWishlist() {
    return apiClient
      .get<{ items?: WishlistItem[] } | WishlistItem[]>(`${BASE}/me/wishlist`)
      .then((payload) => (Array.isArray(payload) ? payload : (payload?.items ?? [])));
  },

  addToWishlist(productId: string | number) {
    return apiClient.post<WishlistItem>(`${BASE}/me/wishlist`, { productId });
  },

  removeFromWishlist(productId: string | number) {
    return apiClient.delete<void>(`${BASE}/me/wishlist/${productId}`);
  },

  // Referrals & Rewards
  getReferralCode() {
    return apiClient
      .get<{ code?: string; referralCode?: string }>(`${BASE}/me/referral-code`)
      .then((payload) => ({ code: payload.code ?? payload.referralCode ?? "" }));
  },

  getReferrals() {
    return apiClient.get<ReferralInfo>(`${BASE}/me/referrals`);
  },

  getRewardPoints() {
    return apiClient.get<RewardPoints>(`${BASE}/me/reward-points`);
  },
};
