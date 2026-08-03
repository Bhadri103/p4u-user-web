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
  adType?: "sell" | "wanted" | null;
  condition?: string | null;
  brand?: string | null;
  model?: string | null;
  manufactureYear?: number | null;
  quantity?: number | null;
  negotiable?: boolean;
  warranty?: boolean;
  invoiceAvailable?: boolean;
  deliveryAvailable?: boolean;
  state?: string | null;
  pincode?: string | null;
  sellerName?: string | null;
  preferredContact?: string | null;
  tags?: string[];
  status?: string | null;
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

type UnknownRow = Record<string, unknown>;
const record = (value: unknown): UnknownRow => value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRow : {};
const text = (row: UnknownRow, keys: string[], fallback = "") => { for (const key of keys) { const value=row[key]; if (value !== null && value !== undefined && String(value).trim() && String(value) !== "[object Object]") return String(value).trim(); } return fallback; };
const number = (row: UnknownRow, keys: string[], fallback = 0) => { const value=text(row,keys); const parsed=Number(value); return Number.isFinite(parsed)?parsed:fallback; };
const bool = (row: UnknownRow, keys: string[]) => { for (const key of keys) { if (row[key] !== undefined && row[key] !== null) return row[key] === true || row[key] === 1 || String(row[key]).toLowerCase() === "true" || String(row[key]).toLowerCase() === "yes"; } return undefined; };
function mediaList(row: UnknownRow): string[] {
  const output:string[]=[]; const add=(value:unknown)=>{ if(value===null||value===undefined)return;if(typeof value==="string"){const v=value.trim();if(!v)return;if(v.startsWith("[")){try{const parsed=JSON.parse(v);if(Array.isArray(parsed)){parsed.forEach(add);return;}}catch{}}if(/^https?:\/\//i.test(v)||v.startsWith("/"))output.push(v);return;}if(Array.isArray(value)){value.forEach(add);return;}if(typeof value!=="object")return;const item=record(value);const next=item.url??item.imageUrl??item.image_url??item.mediaUrl??item.path;if(next!==undefined&&next!==value)add(next); };
  ["imageUrls","image_urls","images","mediaUrls","media_urls","attachments","media","image","imageUrl","image_url","thumbnailUrl","coverImage"].forEach((key)=>add(row[key]));
  return Array.from(new Set(output));
}
export function normalizeClassifiedAd(input: unknown): ClassifiedAd {
  let row=record(input); for(let depth=0;depth<4;depth++){const nested=record(row.classified??row.item??row.listing??row.data);if(!Object.keys(nested).length||nested===row)break;row=nested;}
  const metadata={...record(row.metadata??row.details),...row}; const seller=record(metadata.seller??metadata.owner??metadata.user); const category=record(metadata.category); const images=mediaList(metadata); const city=text(metadata,["city","cityName"]); const area=text(metadata,["area","locality"]); const categoryName=text(metadata,["categoryName","category_name"],text(category,["name"],typeof metadata.category==="string"?metadata.category:""));
  const tagsRaw=metadata.tags??metadata.keywords; const tags=Array.isArray(tagsRaw)?tagsRaw.map(String):typeof tagsRaw==="string"?tagsRaw.split(",").map((v)=>v.trim()).filter(Boolean):[];
  return { id:text(metadata,["id","classifiedId","classified_id","itemId"]), title:text(metadata,["title","name","headline"],"Classified listing"), description:text(metadata,["description","content","body"])||null, price:number(metadata,["price","amount","askingPrice"]), image:images[0]??null, images, categoryId:text(metadata,["categoryId","category_id"],categoryName)||null, categoryName:categoryName||null, city:city||null, area:area||null, location:text(metadata,["location","address"],[area,city].filter(Boolean).join(", "))||null, contactPhone:text(metadata,["contactPhone","contact_phone","phone"],text(seller,["phone","mobile"]))||null, adType:(text(metadata,["ad_type","adType"])||null) as ClassifiedAd["adType"], condition:text(metadata,["condition","itemCondition"])||null, brand:text(metadata,["brand","brandName"])||null, model:text(metadata,["model","modelName"])||null, manufactureYear:number(metadata,["manufacture_year","manufactureYear","year","modelYear"])||null, quantity:number(metadata,["quantity"],1), negotiable:bool(metadata,["negotiable"]), warranty:bool(metadata,["warranty"]), invoiceAvailable:bool(metadata,["invoice_available","invoiceAvailable"]), deliveryAvailable:bool(metadata,["delivery_available","deliveryAvailable"]), state:text(metadata,["state","stateName"])||null, pincode:text(metadata,["pincode","postalCode","postal_code"])||null, sellerName:text(metadata,["sellerName","seller_name"],text(seller,["displayName","name","username"]))||null, preferredContact:text(metadata,["preferred_contact","preferredContact"])||null, tags, status:text(metadata,["status"])||null, postedBy:text(metadata,["postedBy","posted_by","userName"],text(seller,["name","username"]))||null, memberSince:text(metadata,["memberSince","member_since"])||null, createdAt:text(metadata,["createdAt","created_at"])||null, updatedAt:text(metadata,["updatedAt","updated_at"])||null };
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
  list(params?: { q?: string; categoryId?: string; limit?: number; offset?: number; forceRefresh?: boolean }) {
    const { forceRefresh, ...query } = params || {};
    return apiClient
      .get<{ items: ClassifiedAd[]; total: number } | ClassifiedAd[]>(
        `${BASE}/classified`,
        query,
        { forceRefresh: forceRefresh ?? false, cacheTtlMs: forceRefresh ? 0 : 30_000 },
      )
      .then((payload) => { const unwrapped=unwrapItems(payload); return { items:unwrapped.items.map(normalizeClassifiedAd), total:unwrapped.total }; });
  },

  get(id: string) {
    return apiClient.get<unknown>(`${BASE}/classified/${encodeURIComponent(id)}`).then(normalizeClassifiedAd);
  },

  categories(options?: { forceRefresh?: boolean }) {
    return apiClient
      .get<{ items: ClassifiedCategory[]; total: number } | ClassifiedCategory[]>(
        `${BASE}/classified/categories`,
        undefined,
        { forceRefresh: options?.forceRefresh ?? true, cacheTtlMs: options?.forceRefresh === false ? 30_000 : 0 },
      )
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
    adType?: "sell" | "wanted";
    condition?: string;
    brand?: string;
    model?: string;
    manufactureYear?: number;
    quantity?: number;
    negotiable?: boolean;
    warranty?: boolean;
    invoiceAvailable?: boolean;
    deliveryAvailable?: boolean;
    state?: string;
    pincode?: string;
    sellerName?: string;
    preferredContact?: string;
    tags?: string[];
  }) {
    const row = await apiClient.post<ClassifiedAd>(`${BASE}/classified`, {
      name: payload.title,
      description: payload.description,
      price: payload.price,
      categoryId: payload.categoryId,
      city: payload.city,
      area: payload.area,
      contactPhone: payload.contactPhone,
      imageUrls: payload.imageUrls,
      adType: payload.adType,
      condition: payload.condition,
      brand: payload.brand,
      model: payload.model,
      manufactureYear: payload.manufactureYear,
      quantity: payload.quantity,
      negotiable: payload.negotiable,
      warranty: payload.warranty,
      invoiceAvailable: payload.invoiceAvailable,
      deliveryAvailable: payload.deliveryAvailable,
      state: payload.state,
      pincode: payload.pincode,
      sellerName: payload.sellerName,
      preferredContact: payload.preferredContact,
      tags: payload.tags,
    });
    apiClient.clearGetCache(`${BASE}/classified`);
    return normalizeClassifiedAd(row);
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
