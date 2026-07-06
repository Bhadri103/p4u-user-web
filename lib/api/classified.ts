import { apiClient } from "./client";

const BASE = "/api/v1/content";

export interface ClassifiedAd {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image: string | null;
  images: string[];
  categoryId: string | null;
  categoryName: string | null;
  city: string | null;
  area: string | null;
  location: string | null;
  contactPhone: string | null;
  postedBy: string | null;
  memberSince: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ClassifiedCategory {
  id: string;
  name: string;
}

function unwrapItems<T>(payload: T[] | { items?: T[]; total?: number }): { items: T[]; total: number } {
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  return { items: payload?.items ?? [], total: payload?.total ?? payload?.items?.length ?? 0 };
}

function gatewayBase(): string {
  return (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080").replace(/\/$/, "");
}

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("p4u_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const classifiedApi = {
  list(params?: { q?: string; categoryId?: string; limit?: number; offset?: number }) {
    return apiClient
      .get<{ items: ClassifiedAd[]; total: number } | ClassifiedAd[]>(`${BASE}/classified`, params)
      .then(unwrapItems);
  },

  get(id: string) {
    return apiClient.get<ClassifiedAd>(`${BASE}/classified/${encodeURIComponent(id)}`);
  },

  categories() {
    return apiClient
      .get<{ items: ClassifiedCategory[]; total: number } | ClassifiedCategory[]>(`${BASE}/classified/categories`)
      .then(unwrapItems);
  },

  async create(payload: {
    title: string;
    description?: string;
    price?: number | string;
    categoryId?: string;
    city?: string;
    area?: string;
    contactPhone?: string;
    imageUrls?: string[];
  }) {
    return apiClient.post<ClassifiedAd>(`${BASE}/classified`, {
      name: payload.title,
      description: payload.description,
      price: payload.price,
      categoryId: payload.categoryId,
      city: payload.city,
      area: payload.area,
      contactPhone: payload.contactPhone,
      imageUrls: payload.imageUrls,
    });
  },

  async uploadImages(files: File[]): Promise<string[]> {
    if (!files.length) return [];
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    const res = await fetch(`${gatewayBase()}/api/v1/social/upload/multiple`, {
      method: "POST",
      headers: authHeader(),
      body: fd,
    });
    const raw = await res.text();
    let parsed: { files?: { url?: string }[]; message?: string } | null = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      throw new Error(parsed?.message || "Image upload failed");
    }
    const urls = (parsed?.files || []).map((f) => f.url).filter(Boolean) as string[];
    if (!urls.length) throw new Error("No image URLs returned from upload");
    return urls;
  },
};
