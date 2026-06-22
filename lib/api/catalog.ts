import { apiClient, PaginatedResponse } from "./client";

const BASE = "/api/v1/catalog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  thumbnailUrl?: string | null;
  iconUrl?: string | null;
  bannerUrls?: string[] | null;
  /** Legacy */
  image?: string;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  name?: string;
  businessName?: string;
  ownerName?: string;
  description?: string;
  aboutBusiness?: string;
  logo?: string;
  logoUrl?: string | null;
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  banner?: string;
  rating?: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  price: number | string;
  sellPrice?: string;
  finalPrice?: string;
  originalPrice?: number;
  thumbnailUrl?: string | null;
  bannerUrls?: string[] | null;
  image?: string;
  vendorId: string | null;
  categoryId?: string | null;
  serviceId?: string | null;
  isActive: boolean;
  metadata?: { imageUrl?: string; brand?: string; [key: string]: unknown };
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string | null;
  price: number | string;
  /** DB column: optional listing / “from” price; vendor-specific price is on vendor–service offers. */
  basePrice?: string | number | null;
  duration?: string;
  vendorId?: string | null;
  categoryId?: string | null;
  isActive: boolean;
  metadata?: { imageUrl?: string; price?: string; [key: string]: unknown };
}

/** `GET /api/v1/catalog/browse/services/:serviceId/vendors` */
export interface ServiceVendorOffer {
  vendorServiceId: string;
  price: string;
  isAvailable: boolean;
  vendor: {
    id: string;
    businessName: string;
    logoUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
}

export type ProductBrowseRow = Product & {
  vendorBusinessName?: string | null;
  vendorLogoUrl?: string | null;
};

export interface SearchResult {
  products: Product[];
  services: ServiceItem[];
  vendors: Vendor[];
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const catalogApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  getCategories(params?: {
    limit?: number;
    offset?: number;
    includeInactive?: boolean;
    /** `product` = shop categories + subs; `service` = service categories only. */
    kind?: "product" | "service";
  }) {
    return apiClient.get<PaginatedResponse<Category>>(`${BASE}/categories`, params as Record<string, string | number | boolean>);
  },

  getCategoryChildren(
    categoryId: string,
    params?: { kind?: "product" | "service" }
  ) {
    return apiClient.get<Category[]>(`${BASE}/categories/${categoryId}/children`, params as Record<string, string | number | boolean>, {
      cacheTtlMs: 60_000,
    });
  },

  getVendors(params?: { limit?: number; offset?: number; vendorKind?: "product" | "service" }) {
    return apiClient.get<PaginatedResponse<Vendor>>(`${BASE}/vendors`, params as Record<string, string | number | boolean>, { cacheTtlMs: 20_000 });
  },

  getVendor(vendorId: number | string) {
    return apiClient.get<Vendor>(`${BASE}/vendors/${vendorId}`, undefined, { cacheTtlMs: 45_000 });
  },

  getVendorProducts(vendorId: number | string, params?: { limit?: number; offset?: number }) {
    return apiClient.get<PaginatedResponse<Product>>(`${BASE}/vendors/${vendorId}/products`, params as Record<string, string | number | boolean>, { cacheTtlMs: 20_000 });
  },

  getProduct(productId: number | string) {
    return apiClient.get<Product>(`${BASE}/products/${productId}`, undefined, { cacheTtlMs: 45_000 });
  },

  getServices(params?: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    subcategoryId?: string;
  }) {
    return apiClient.get<PaginatedResponse<ServiceItem>>(`${BASE}/services`, params as Record<string, string | number | boolean>, { cacheTtlMs: 20_000 });
  },

  /** Shop tab: products only, filtered by shared category tree. */
  browseProducts(params?: {
    limit?: number;
    offset?: number;
    categoryId?: string;
    subcategoryId?: string;
  }) {
    return apiClient.get<PaginatedResponse<ProductBrowseRow>>(`${BASE}/browse/products`, params as Record<string, string | number | boolean>, { cacheTtlMs: 20_000 });
  },

  /** After choosing a service: vendors offering it with per-vendor price. */
  getServiceVendorOffers(serviceId: string) {
    return apiClient.get<ServiceVendorOffer[]>(`${BASE}/browse/services/${serviceId}/vendors`, undefined, { cacheTtlMs: 30_000 });
  },

  getService(serviceId: string | number) {
    return apiClient.get<ServiceItem>(`${BASE}/services/${serviceId}`, undefined, { cacheTtlMs: 45_000 });
  },

  prefetchVendor(vendorId: string | number) {
    return this.getVendor(vendorId).then(() => undefined);
  },

  prefetchVendorProducts(vendorId: string | number, params?: { limit?: number; offset?: number }) {
    return this.getVendorProducts(vendorId, params).then(() => undefined);
  },

  prefetchProduct(productId: string | number) {
    return this.getProduct(productId).then(() => undefined);
  },

  prefetchServiceVendorOffers(serviceId: string | number) {
    return this.getServiceVendorOffers(String(serviceId)).then(() => undefined);
  },

  search(q: string, params?: { limit?: number; offset?: number }) {
    return apiClient.get<SearchResult>(`${BASE}/search`, { q, ...params } as Record<string, string | number | boolean>);
  },
};
