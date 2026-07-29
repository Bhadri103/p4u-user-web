import { apiClient } from "./client";

const BASE = "/api/auth";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn?: number;
  roles?: string[];
  permissions?: string[];
  vendorId?: string | null;
  customerId?: string | null;
}

export type IntendedRole = "CUSTOMER" | "VENDOR";

export interface PhoneExchangeResponse {
  loggedIn: boolean;
  phone: string;
  /** Present when loggedIn === true. */
  auth?: LoginResponse;
  /** Present when loggedIn === false (new user). FE posts this back to /register-by-phone. */
  registrationToken?: string;
  intendedRole?: IntendedRole;
}

export interface PublicOccupation {
  id: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** Profile collected on user-web signup (matches admin customer create fields). */
export interface SignupProfilePayload {
  fullName: string;
  email: string;
  occupationId: string | null;
  /** If set, `occupationId` is ignored; saved as profile metadata `occupation` for admin display. */
  customOccupation?: string | null;
}

export interface CustomerRegisterByPhoneRequest {
  registrationToken: string;
  fullName: string;
  email?: string | null;
  state?: string | null;
  district?: string | null;
  areaLocality?: string | null;
  pincode?: string | null;
  occupationId?: string | null;
  customOccupation?: string | null;
  /** Decimal degrees if user clicks "Capture Location". */
  latitude?: number | null;
  longitude?: number | null;
  referralCode?: string | null;
}

export interface RegisterVendorPayload {
  vendorKind: "service" | "product" | "both";
  vendorType: "SERVICE" | "PRODUCT" | "BOTH";
  ownerName?: string;
  businessName?: string;
  businessType?: string | null;
  email?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  gst?: string | null;
  pan?: string | null;
  categoriesJson?: unknown;
  servicesJson?: unknown;
  addressJson?: Record<string, unknown> | null;
  documentsJson?: Record<string, unknown> | null;
  bankJson?: Record<string, unknown> | null;
}

export interface RegistrationProductCategory {
  id: string;
  name: string;
  slug?: string | null;
}

export const authApi = {
  /**
   * Occupations for signup/profile — same payload semantics as admin
   * `listOccupations({ purpose: 'all' })` (active + inactive, sort_order then name).
   */
  listPublicOccupations() {
    return apiClient.get<{ items: PublicOccupation[] }>(
      `${BASE}/public/occupations`,
      { purpose: "all" },
      { cacheTtlMs: 120_000 },
    );
  },

  /**
   * Step 1 of phone-OTP login. Send the Firebase ID token from the browser
   * SDK; backend either returns Keycloak tokens (existing user) or a
   * short-lived registration token (new user — FE goes to /register).
   */
  phoneExchange(idToken: string, intendedRole: IntendedRole = "CUSTOMER") {
    return apiClient.postInternal<PhoneExchangeResponse>(
      `${BASE}/public/phone/exchange`,
      { idToken, intendedRole },
      { skipAuthHeader: true, skipAuthRefresh: true },
    );
  },

  /** Step 2 of customer signup. */
  registerCustomerByPhone(payload: CustomerRegisterByPhoneRequest) {
    return apiClient.postInternal<LoginResponse>(
      `${BASE}/public/customer/register-by-phone`,
      payload,
      { skipAuthHeader: true, skipAuthRefresh: true },
    );
  },

  refreshToken(refreshToken: string) {
    return apiClient.postInternal<LoginResponse>(
      `${BASE}/public/refresh`,
      { refreshToken },
      { skipAuthHeader: true, skipAuthRefresh: true },
    );
  },

  logout(refreshToken: string) {
    return apiClient.post<{ message: string }>(`${BASE}/logout`, { refreshToken });
  },

  /** Product taxonomy managed by admin; shared by every vendor-registration UI. */
  registrationProductCategories() {
    return apiClient.get<RegistrationProductCategory[]>(
      "/api/v1/catalog/categories?kind=product&includeInactive=false",
    );
  },

  /** No-OTP vendor self-registration from user web "Become a Seller" flow. */
  registrationServiceCategories() {
    return apiClient.get<RegistrationProductCategory[]>(
      "/api/v1/catalog/categories?kind=service&includeInactive=false",
    );
  },
  registerVendor(payload: RegisterVendorPayload) {
    return apiClient.postInternal<{ status: string; message: string }>(
      `${BASE}/public/vendor/register`,
      payload,
      { skipAuthHeader: true, skipAuthRefresh: true },
    );
  },
};
