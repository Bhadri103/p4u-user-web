/**
 * Admin / vendor / socio uploads are often stored as path-only URLs (`/uploads/...`,
 * `/vendor-uploads/...`, `/socio-uploads/...`). The user app loads them via the API gateway
 * (`NEXT_PUBLIC_API_GATEWAY_URL`); `resolveMediaUrl` prefixes those paths with the gateway origin.
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:8080";

function gatewayOrigin(): string {
  try {
    return new URL(GATEWAY).origin;
  } catch {
    return "http://localhost:8080";
  }
}

/** Optional: dedicated origin for `/uploads` if different from the gateway (no trailing slash). */
function assetOrigin(): string {
  const m = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim();
  if (m) return m.replace(/\/$/, "");
  return gatewayOrigin();
}

/**
 * Turn stored upload URLs into a URL the browser can load.
 * - Path-only `/uploads/...` or `/vendor-uploads/...` → prefixed with gateway origin
 *   (gateway proxies these to admin / vendor file storage).
 * - Absolute URLs whose path is `/uploads` or `/vendor-uploads` → same origin rewrite
 *   so dev hostnames (e.g. old :8082 links) still resolve via the configured gateway.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/uploads") || u.startsWith("/vendor-uploads") || u.startsWith("/socio-uploads")) {
    return `${assetOrigin()}${u}`;
  }
  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u);
      if (parsed.pathname.startsWith("/uploads") || parsed.pathname.startsWith("/vendor-uploads") || parsed.pathname.startsWith("/socio-uploads")) {
        return `${assetOrigin()}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return u;
    }
  }
  return u;
}

export function pickProductImage(p: {
  thumbnailUrl?: string | null;
  bannerUrls?: string[] | null;
  image?: string | null;
  metadata?: { imageUrl?: string; vendorIconUrl?: string; [key: string]: unknown } | null;
}): string | null {
  const raw =
    p.thumbnailUrl ||
    (Array.isArray(p.bannerUrls) && p.bannerUrls.length ? p.bannerUrls[0] : null) ||
    p.metadata?.imageUrl ||
    (typeof p.metadata?.vendorIconUrl === "string" ? p.metadata.vendorIconUrl : null) ||
    p.image ||
    null;
  return resolveMediaUrl(raw);
}

/** Ordered gallery: thumbnail first, then banner images (deduped). */
export function buildProductGalleryImages(p: {
  thumbnailUrl?: string | null;
  bannerUrls?: string[] | null;
  image?: string | null;
  imageUrl?: string | null;
  metadata?: { imageUrl?: string } | null;
  images?: string[] | null;
}): string[] {
  if (p.images?.length) {
    return [...new Set(p.images.map((x) => resolveMediaUrl(x)).filter(Boolean) as string[])];
  }
  const out: string[] = [];
  const push = (x: string | null) => {
    if (x && !out.includes(x)) out.push(x);
  };
  push(resolveMediaUrl(p.thumbnailUrl));
  for (const b of p.bannerUrls || []) {
    push(resolveMediaUrl(b));
  }
  if (!out.length) {
    push(resolveMediaUrl(p.metadata?.imageUrl ?? null));
    push(resolveMediaUrl(p.imageUrl ?? null));
    push(resolveMediaUrl(p.image ?? null));
  }
  return out;
}

export function pickVendorImage(v: {
  thumbnailUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  logo?: string | null;
  banner?: string | null;
}): string | null {
  const raw = v.thumbnailUrl || v.logoUrl || v.bannerUrl || v.logo || v.banner || null;
  return resolveMediaUrl(raw);
}

export function pickCategoryImage(c: {
  thumbnailUrl?: string | null;
  iconUrl?: string | null;
  bannerUrls?: string[] | null;
  image?: string | null;
}): string | null {
  const raw =
    c.thumbnailUrl ||
    c.iconUrl ||
    (Array.isArray(c.bannerUrls) && c.bannerUrls.length ? c.bannerUrls[0] : null) ||
    c.image ||
    null;
  return resolveMediaUrl(raw);
}

export function pickServiceImage(s: {
  iconUrl?: string | null;
  thumbnailUrl?: string | null;
  bannerUrls?: string[] | null;
  metadata?: {
    imageUrl?: string;
    vendorIconUrl?: string;
    iconUrl?: string;
    [key: string]: unknown;
  } | null;
}): string | null {
  const m = s.metadata;
  const raw =
    s.iconUrl ||
    s.thumbnailUrl ||
    (Array.isArray(s.bannerUrls) && s.bannerUrls.length ? s.bannerUrls[0] : null) ||
    (typeof m?.imageUrl === "string" ? m.imageUrl : null) ||
    (typeof m?.vendorIconUrl === "string" ? m.vendorIconUrl : null) ||
    (typeof m?.iconUrl === "string" ? m.iconUrl : null) ||
    null;
  return resolveMediaUrl(raw);
}
