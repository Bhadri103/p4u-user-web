import { apiClient } from "./client";

const BASE = "/api/v1/content";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Banner {
  id: number | string;
  title?: string;
  image?: string;
  imageUrl?: string;
  link?: string;
  redirectUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  metadata?: {
    homepageCMS?: boolean;
    cmsSlot?: "hero" | "content" | "video" | string;
    subtitle?: string;
    mediaType?: "image" | "video" | string;
    sectionType?: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    durationSec?: number;
    ctaText?: string;
    ctaLink?: string;
    redirectType?: "external" | "internal" | string;
    redirectId?: string;
    linkType?: string;
    linkTarget?: string;
    targetLocation?: string;
    targetSegment?: string;
    themeHeaderColor?: string;
    themeBgColor?: string;
    themeButtonColor?: string;
    backgroundGradient?: string;
    festivalTag?: string;
    displayMode?: string;
    showAfterSeconds?: number;
    autoExpandFullscreen?: boolean;
    startDate?: string;
    endDate?: string;
  };
}

export interface Popup {
  id: number | string;
  title?: string;
  image?: string;
  imageUrl?: string;
  content?: string;
  redirectUrl?: string;
  isActive: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  metadata?: {
    appType?: string;
    screenId?: string;
    [key: string]: unknown;
  } | null;
}

export interface Reel {
  id: number;
  videoUrl: string;
  caption?: string;
  username?: string;
  thumbnail?: string;
}

export interface ClassifiedItem {
  id: number;
  title: string;
  subtitle?: string;
  price: number;
  location?: string;
  image?: string;
}

export interface BrandItem {
  id: string;
  name: string;
  imageUrl: string;
  redirectUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FeaturedProductItem {
  id: string;
  name: string;
  imageUrl: string;
  section?: string;
  price?: string;
  redirectUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceHighlightItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  iconUrl?: string;
  redirectUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface HomeContent {
  banners: Banner[];
  popups: Popup[];
  reels: Reel[];
  classified: ClassifiedItem[];
  brands: BrandItem[];
  featuredProducts: FeaturedProductItem[];
  serviceHighlights: ServiceHighlightItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function unwrapItems<T>(payload: T[] | { items?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? [];
}

/* ------------------------------------------------------------------ */
/*  API functions                                                      */
/* ------------------------------------------------------------------ */

export const contentApi = {
  health() {
    return apiClient.get<{ status: string }>(`${BASE}/public/health`);
  },

  getBanners() {
    return apiClient.get<Banner[] | { items: Banner[] }>(`${BASE}/banners`).then(unwrapItems);
  },

  getPopups() {
    return apiClient.get<Popup[] | { items: Popup[] }>(`${BASE}/popups`).then(unwrapItems);
  },

  getReels() {
    return apiClient.get<Reel[] | { items: Reel[] }>(`${BASE}/reels`).then(unwrapItems);
  },

  getClassified() {
    return apiClient.get<ClassifiedItem[] | { items: ClassifiedItem[] }>(`${BASE}/classified`).then(unwrapItems);
  },

  getHome() {
    return apiClient.get<HomeContent>(`${BASE}/home`);
  },

  getBrands() {
    return apiClient.get<BrandItem[] | { items: BrandItem[] }>(`${BASE}/brands`).then(unwrapItems);
  },

  getFeaturedProducts() {
    return apiClient.get<FeaturedProductItem[] | { items: FeaturedProductItem[] }>(`${BASE}/featured-products`).then(unwrapItems);
  },

  getServiceHighlights() {
    return apiClient.get<ServiceHighlightItem[] | { items: ServiceHighlightItem[] }>(`${BASE}/service-highlights`).then(unwrapItems);
  },

  subscribeNewsletter(email: string, fullName?: string, phone?: string) {
    return apiClient.post<{ id?: number; message?: string }>(`${BASE}/newsletter/subscribe`, {
      email,
      fullName,
      phone,
    });
  },
};
