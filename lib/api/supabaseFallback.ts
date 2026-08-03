/**
 * Direct Supabase adapter used by the customer web while the API gateway is
 * unavailable. Its route mapping mirrors the working Flutter customer app's
 * SupabaseFallback service.
 */

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_P4U_SUPABASE_URL ||
  "https://jhtddsqnpfvjvnfojeea.supabase.co"
).replace(/\/$/, "");

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_P4U_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodGRkc3FucGZ2anZuZm9qZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTE3NTksImV4cCI6MjA4ODk2Nzc1OX0.ENeCHn70-5_I0tb61rr1q0q-VoI7f2mqcTBoL7yxhP0";

export const USE_SUPABASE_DIRECT =
  process.env.NEXT_PUBLIC_P4U_USE_SUPABASE_DIRECT === "true";
const REQUEST_TIMEOUT_MS = 10_000;

type JsonMap = Record<string, unknown>;
type Query = Record<string, string>;

interface DirectApiError {
  status: number;
  message: string;
  details?: unknown;
}

function apiError(status: number, message: string, details?: unknown): DirectApiError {
  return { status, message, details };
}

function storageGet(key: string): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(key);
}

function localJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(storageGet(key) ?? "") as T; } catch { return fallback; }
}

function setLocalJson(key: string, value: unknown): void {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function customerId(): string | null {
  return storageGet("p4u_customer_id");
}

function decodeJwt(token: string | null): JsonMap | null {
  if (!token) return null;
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const text =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    return JSON.parse(text) as JsonMap;
  } catch {
    return null;
  }
}

function isSupabaseToken(token: string | null): boolean {
  const payload = decodeJwt(token);
  const ref = String(payload?.ref ?? "");
  const issuer = String(payload?.iss ?? "");
  return ref === "jhtddsqnpfvjvnfojeea" || issuer.includes("jhtddsqnpfvjvnfojeea.supabase.co");
}

function authUserId(): string {
  const payload = decodeJwt(storageGet("p4u_token"));
  const id = String(payload?.sub ?? "").trim();
  if (!id) throw apiError(401, "Please login to continue.");
  return id;
}

function optionalAuthUserId(): string {
  const payload = decodeJwt(storageGet("p4u_token"));
  return String(payload?.sub ?? "").trim();
}

function camelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as JsonMap).map(([key, item]) => [camelKey(key), camelize(item)]),
  );
}

function asMap(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap)
    : {};
}

function asRows(value: unknown): JsonMap[] {
  return Array.isArray(value)
    ? value.filter((row): row is JsonMap => Boolean(row) && typeof row === "object")
    : [];
}

function firstMediaString(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if ((trimmed.startsWith("[") || trimmed.startsWith("{"))) {
      try { return firstMediaString(JSON.parse(trimmed)); } catch { /* use the string as-is */ }
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMediaString(item);
      if (found) return found;
    }
    return "";
  }
  const row = asMap(value);
  for (const key of ["url", "mediaUrl", "videoUrl", "fileUrl", "imageUrl", "thumbnailUrl", "path"]) {
    const found = firstMediaString(row[key]);
    if (found) return found;
  }
  return "";
}

function socialMediaList(row: JsonMap): string[] {
  const values: string[] = [];
  for (const key of ["mediaUrls", "videoUrls", "imageUrls", "images", "attachments", "media"]) {
    const rawValue = row[key];
    let items: unknown[] = Array.isArray(rawValue) ? rawValue : rawValue == null ? [] : [rawValue];
    if (typeof rawValue === "string" && rawValue.trim().startsWith("[")) {
      try { const parsed = JSON.parse(rawValue); if (Array.isArray(parsed)) items = parsed; } catch { /* keep original */ }
    }
    for (const item of items) {
      const found = firstMediaString(item);
      if (found && !values.includes(found)) values.push(found);
    }
  }
  if (!values.length) {
    const fallback = firstMediaString(row.mediaUrl ?? row.videoUrl ?? row.imageUrl ?? row.thumbnailUrl ?? row.image);
    if (fallback) values.push(fallback);
  }
  return values;
}

function normalizeRow(table: string, raw: JsonMap): JsonMap {
  const row = camelize(raw) as JsonMap;
  const active = String(row.status ?? "active").toLowerCase() === "active";

  if (table === "categories" || table === "service_categories") {
    return {
      ...row,
      thumbnailUrl: row.thumbnailUrl ?? row.image ?? row.icon ?? null,
      iconUrl: row.iconUrl ?? row.icon ?? row.image ?? null,
      bannerUrls: row.bannerUrls ?? (row.bannerImage ? [row.bannerImage] : []),
      isActive: active,
    };
  }
  if (table === "vendors") {
    return {
      ...row,
      businessName: row.businessName ?? row.name ?? "",
      ownerName: row.ownerName ?? row.name ?? "",
      logoUrl: row.logoUrl ?? row.shopPhotoUrl ?? null,
      thumbnailUrl: row.thumbnailUrl ?? row.shopPhotoUrl ?? null,
      bannerUrl: row.bannerUrl ?? row.backgroundImage ?? null,
      isActive: active,
    };
  }
  if (table === "products") {
    const images = Array.isArray(row.images) ? row.images : [];
    const image = row.thumbnailImage ?? row.image ?? images[0] ?? row.bannerImage ?? null;
    return {
      ...row,
      name: row.name ?? row.title ?? "Product",
      thumbnailUrl: row.thumbnailUrl ?? image,
      bannerUrls: row.bannerUrls ?? (images.length ? images : row.bannerImage ? [row.bannerImage] : []),
      sellPrice: row.sellPrice ?? row.price,
      finalPrice: row.finalPrice ?? row.price,
      isActive: active,
      metadata: { ...asMap(row.metadata), imageUrl: image },
    };
  }
  if (table === "services") {
    return {
      ...row,
      name: row.name ?? row.title ?? "Service",
      iconUrl: row.iconUrl ?? row.image ?? null,
      basePrice: row.basePrice ?? row.price,
      isActive: active,
      metadata: { ...asMap(row.metadata), imageUrl: row.image ?? null, price: row.price },
    };
  }
  if (table === "banners" || table === "popup_banners") {
    const image = row.mobileImage ?? row.desktopImage ?? row.image ?? null;
    return {
      ...row,
      image,
      imageUrl: row.imageUrl ?? image,
      redirectUrl: row.redirectUrl ?? row.link ?? null,
      sortOrder: row.sortOrder ?? row.priority ?? 0,
      isActive: active,
    };
  }
  if (table === "social_posts") {
    const author = asMap(row.author ?? row.user ?? row.profile);
    const media = socialMediaList(row);
    return {
      ...row,
      userId: row.userId ?? row.authorId ?? row.customerId ?? author.id ?? author.userId,
      userName: row.username ?? row.userName ?? row.authorName ?? author.displayName ?? author.name ?? author.username,
      userAvatar: row.userAvatar ?? row.avatarUrl ?? row.authorAvatar ?? author.avatarUrl ?? author.avatar,
      contentText: row.caption ?? row.contentText ?? row.content ?? row.body ?? "",
      mediaUrls: media,
      imageUrl: row.imageUrl ?? media[0] ?? null,
      postType: row.postType ?? (media[0] && /\.(mp4|mov|webm)(\?|$)/i.test(media[0]) ? "video" : media.length ? "image" : "text"),
      likeCount: row.likeCount ?? row.likesCount ?? row.likes ?? 0,
      commentCount: row.commentCount ?? row.commentsCount ?? row.comments ?? 0,
      shareCount: row.shareCount ?? row.sharesCount ?? row.shares ?? 0,
      createdAt: row.createdAt ?? row.publishedAt ?? row.updatedAt ?? "",
    };
  }
  if (table === "social_stories") {
    const mediaUrl = firstMediaString(row.mediaUrl ?? row.mediaUrls ?? row.imageUrl ?? row.videoUrl ?? row.image);
    return { ...row, userId: row.userId ?? row.authorId ?? row.customerId, userName: row.userName ?? row.username ?? row.authorName, userAvatar: row.userAvatar ?? row.avatarUrl ?? row.authorAvatar, mediaUrl, mediaType: row.mediaType ?? (/\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl) ? "video" : "image"), createdAt: row.createdAt ?? "" };
  }
  if (table === "social_comments") {
    return { ...row, postId: row.postId, userId: row.userId ?? row.authorId, userName: row.userName ?? row.username ?? row.authorName, userAvatar: row.userAvatar ?? row.avatarUrl, contentText: row.contentText ?? row.content ?? row.body ?? "", createdAt: row.createdAt ?? "" };
  }
  if (table === "social_messages") {
    return { ...row, conversationId: row.conversationId, senderId: row.senderId ?? row.userId, content: row.content ?? row.contentText ?? "", mediaUrl: firstMediaString(row.mediaUrl ?? row.attachment), createdAt: row.createdAt ?? "" };
  }
  if (table === "social_notifications") {
    return { ...row, actorId: row.actorId ?? row.senderId ?? row.userId, actorName: row.actorName ?? row.senderName ?? row.userName, actorAvatar: row.actorAvatar ?? row.senderAvatar ?? row.avatarUrl, createdAt: row.createdAt ?? "", isRead: Boolean(row.isRead ?? row.readAt) };
  }
  if (table === "social_conversations") {
    return { ...row, participantId: row.participantId ?? row.otherUserId, participantName: row.participantName ?? row.otherUserName, participantAvatar: row.participantAvatar ?? row.otherUserAvatar, lastMessageAt: row.lastMessageAt ?? row.updatedAt ?? row.createdAt, unreadCount: row.unreadCount ?? 0 };
  }
  if (table === "classified_ads") {
    const images = socialMediaList(row);
    const city = String(row.city ?? "").trim();
    const area = String(row.area ?? row.locality ?? "").trim();
    return { ...row, title: row.title ?? row.name ?? "Classified listing", image: row.image ?? row.imageUrl ?? images[0] ?? null, images, categoryId: row.categoryId ?? row.category ?? null, categoryName: row.categoryName ?? row.category ?? null, city: city || null, area: area || null, location: row.location ?? ([area, city].filter(Boolean).join(", ") || null), contactPhone: row.contactPhone ?? row.phone ?? null, postedBy: row.postedBy ?? row.userName ?? null, createdAt: row.createdAt ?? null, updatedAt: row.updatedAt ?? null };
  }
  if (table === "properties") {
    const images = socialMediaList(row);
    return { ...row, transaction_type: row.transactionType ?? row.listingType ?? "sale", property_type: row.propertyType ?? "apartment", image_url: row.imageUrl ?? images[0] ?? null, images, area_sqft: row.areaSqft ?? row.builtUpArea ?? 0, carpet_area: row.carpetArea ?? 0, total_floors: row.totalFloors ?? null, property_age_years: row.propertyAgeYears ?? null, price_negotiable: row.priceNegotiable ?? false, security_deposit: row.securityDeposit ?? 0, available_from: row.availableFrom ?? null, contact_name: row.contactName ?? row.ownerName ?? null, contact_phone: row.contactPhone ?? row.phone ?? null, posted_by: row.postedBy ?? "owner", created_at: row.createdAt ?? null };
  }
  if (table === "customers") {
    return {
      ...row,
      fullName: row.fullName ?? row.name ?? "Customer",
      phone: row.phone ?? row.mobile ?? null,
      avatarUrl: row.avatarUrl ?? row.profileImage ?? null,
      walletPoints: row.walletPoints ?? 0,
    };
  }
  return row;
}

async function raw(
  method: string,
  path: string,
  query: Query = {},
  body?: unknown,
  authenticated = false,
  responseMeta?: { contentRange?: string },
): Promise<unknown> {
  const url = new URL(`${SUPABASE_URL}${path}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const saved = authenticated ? storageGet("p4u_token") : null;
  const bearer = isSupabaseToken(saved) ? saved! : SUPABASE_ANON_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`,
  };
  if (["POST", "PUT", "PATCH"].includes(method)) {
    headers["Content-Type"] = "application/json";
    // `Prefer` is a PostgREST write directive. Supabase Edge Functions do not
    // need it, and functions with a strict CORS allow-list can reject the
    // browser preflight when it is present.
    if (!path.startsWith("/functions/v1/")) {
      headers.Prefer = "return=representation";
    }
  } else if (method === "GET" && path.startsWith("/rest/v1/")) {
    // PostgREST only exposes the full number of matching rows when an exact
    // count is requested. Without this, paginated responses incorrectly use
    // the current page length as their total (for example every `limit=1`
    // category count appears as either 0 or 1).
    headers.Prefer = "count=exact";
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw apiError(
      0,
      timedOut
        ? "The Planext4u data service is taking too long to respond. Please try again."
        : "Network error: could not reach the Planext4u data service.",
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await response.text();
  let decoded: unknown = null;
  try {
    decoded = text ? JSON.parse(text) : null;
  } catch {
    decoded = text;
  }
  if (!response.ok) {
    const details = asMap(decoded);
    throw apiError(
      response.status,
      String(details.message ?? details.errorDescription ?? details.error ?? "Planext4u request failed"),
      decoded,
    );
  }
  if (responseMeta) {
    responseMeta.contentRange = response.headers.get("content-range") ?? undefined;
  }
  return decoded;
}

async function rest(
  method: string,
  table: string,
  query: Query = {},
  body?: unknown,
  responseMeta?: { contentRange?: string },
): Promise<unknown> {
  return raw(method, `/rest/v1/${table}`, query, body, true, responseMeta);
}

async function list(
  table: string,
  options: { filters?: Query; order?: string; limit?: number; offset?: number } = {},
): Promise<JsonMap> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const responseMeta: { contentRange?: string } = {};
  const result = await rest("GET", table, {
    select: "*",
    ...(options.filters ?? {}),
    ...(options.order ? { order: options.order } : {}),
    limit: String(limit),
    offset: String(offset),
  }, undefined, responseMeta);
  const rows = asRows(result).map((row) => normalizeRow(table, row));
  const totalMatch = responseMeta.contentRange?.match(/\/(\d+)$/);
  const total = totalMatch ? Number(totalMatch[1]) : rows.length;
  return { data: rows, items: rows, total, limit, offset };
}

async function single(table: string, id: string): Promise<JsonMap> {
  if (!id) return {};
  const result = await rest("GET", table, { select: "*", id: `eq.${id}`, limit: "1" });
  const first = asRows(result)[0];
  return first ? normalizeRow(table, first) : {};
}

async function insert(table: string, body: JsonMap): Promise<JsonMap> {
  const result = await rest("POST", table, {}, body);
  const first = asRows(result)[0];
  return first ? normalizeRow(table, first) : { ok: true };
}

async function update(table: string, id: string, body: JsonMap): Promise<JsonMap> {
  const result = await rest("PATCH", table, { id: `eq.${id}` }, body);
  const first = asRows(result)[0];
  return first ? normalizeRow(table, first) : { ok: true };
}

async function remove(table: string, filters: Query): Promise<JsonMap> {
  await rest("DELETE", table, filters);
  return { ok: true };
}

function rowsFromList(value: JsonMap): JsonMap[] {
  return (value.data ?? value.items ?? []) as JsonMap[];
}

function customerIdentity(row: JsonMap): string[] {
  return [row.id, row.supabaseUid, row.firebaseUid, row.userId]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

async function customerByIdentity(identity: string): Promise<JsonMap> {
  if (!identity) return {};
  const directId = customerId();
  if (directId && identity === optionalAuthUserId()) {
    const mine = await single("customers", directId).catch(() => ({}));
    if (Object.keys(mine).length) return mine;
  }
  const candidates = await list("customers", {
    filters: { or: `(id.eq.${identity},supabase_uid.eq.${identity})` },
    limit: 1,
  }).catch(() => ({ data: [] }));
  return rowsFromList(candidates)[0] ?? {};
}

async function hydrateSocialList(value: JsonMap): Promise<JsonMap> {
  const rows = rowsFromList(value);
  const cache = new Map<string, JsonMap>();
  const hydrated = await Promise.all(rows.map(async (row) => {
    const ownerId = String(row.userId ?? row.authorId ?? row.customerId ?? "");
    if (!ownerId || (row.userName && row.userAvatar)) return row;
    let customer = cache.get(ownerId);
    if (!customer) {
      customer = await customerByIdentity(ownerId);
      cache.set(ownerId, customer);
    }
    return {
      ...row,
      userId: ownerId,
      userName: row.userName ?? customer.fullName ?? customer.name ?? customer.username ?? "Planext user",
      userAvatar: row.userAvatar ?? customer.avatarUrl ?? customer.profileImage ?? null,
    };
  }));
  return { ...value, data: hydrated, items: hydrated, total: hydrated.length };
}

function socialProfileFromCustomer(customer: JsonMap, overrides: JsonMap = {}): JsonMap {
  const metadata = asMap(customer.metadata);
  const id = String(customer.id ?? customer.supabaseUid ?? optionalAuthUserId());
  const username = String(overrides.username ?? metadata.socioUsername ?? customer.username ?? customer.fullName ?? customer.name ?? "user");
  return {
    userId: id,
    userName: username,
    displayName: overrides.displayName ?? metadata.socioDisplayName ?? customer.fullName ?? customer.name ?? username,
    username,
    userAvatar: overrides.avatarUrl ?? metadata.socioAvatarUrl ?? customer.avatarUrl ?? customer.profileImage ?? null,
    bio: overrides.bio ?? metadata.socioBio ?? customer.bio ?? null,
    website: overrides.website ?? metadata.socioWebsite ?? null,
    pronouns: overrides.pronouns ?? metadata.socioPronouns ?? "",
    location: overrides.location ?? metadata.socioLocation ?? customer.city ?? null,
    category: overrides.category ?? metadata.socioCategory ?? null,
    accountType: overrides.accountType ?? metadata.socioAccountType ?? "personal",
    isPrivate: Boolean(overrides.isPrivate ?? metadata.socioIsPrivate),
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
    isSelf: customerIdentity(customer).includes(optionalAuthUserId()) || String(customer.id ?? "") === String(customerId() ?? ""),
  };
}

async function socialProfileWithCounts(customer: JsonMap, overrides: JsonMap = {}): Promise<JsonMap> {
  const profile = socialProfileFromCustomer(customer, overrides);
  const ownerId = String(customer.supabaseUid ?? customer.id ?? profile.userId ?? "");
  const [posts, followers, following] = await Promise.all([
    list("social_posts", { filters: { user_id: `eq.${ownerId}` }, limit: 100 }).catch(() => ({ data: [] })),
    list("social_follows", { filters: { following_id: `eq.${ownerId}` }, limit: 100 }).catch(() => ({ data: [] })),
    list("social_follows", { filters: { follower_id: `eq.${ownerId}` }, limit: 100 }).catch(() => ({ data: [] })),
  ]);
  return { ...profile, postCount: rowsFromList(posts).length, followerCount: rowsFromList(followers).length, followingCount: rowsFromList(following).length };
}

function numberParam(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

async function phoneAuth(firebaseToken: string, register = false, registration: JsonMap = {}) {
  if (!firebaseToken) throw apiError(400, "Missing phone verification token.");
  const result = asMap(
    await raw("POST", "/functions/v1/firebase-phone-auth", {}, {
      firebase_id_token: firebaseToken,
      ...(register
        ? {
            mode: "register",
            register_data: {
              name: registration.fullName,
              email: registration.email,
              mobile: registration.phone,
              occupation: registration.customOccupation,
              referral_code: registration.referralCode,
            },
          }
        : {}),
    }),
  );
  if (result.success !== true || !result.token_hash) {
    return {
      loggedIn: false,
      code: result.code,
      message: result.error ?? "Phone verification failed.",
      registrationToken: firebaseToken,
    };
  }
  const verified = asMap(
    await raw("POST", "/auth/v1/verify", {}, {
      token_hash: result.token_hash,
      type: "magiclink",
    }),
  );
  const customer = asMap(result.customer);
  const auth = {
    accessToken: verified.access_token,
    refreshToken: verified.refresh_token,
    tokenType: verified.token_type ?? "bearer",
    expiresIn: Number(verified.expires_in ?? 3600),
    customerId: customer.id ?? null,
    roles: ["CUSTOMER"],
  };
  return register
    ? auth
    : {
        loggedIn: true,
        phone: customer.mobile ?? customer.phone ?? "",
        auth,
      };
}

async function refresh(refreshToken: string): Promise<JsonMap> {
  if (!refreshToken) throw apiError(401, "Session expired. Please login again.");
  const result = asMap(
    await raw(
      "POST",
      "/auth/v1/token",
      { grant_type: "refresh_token" },
      { refresh_token: refreshToken },
    ),
  );
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    tokenType: result.token_type ?? "bearer",
    expiresIn: Number(result.expires_in ?? 3600),
  };
}

async function catalog(path: string, params: URLSearchParams): Promise<unknown | undefined> {
  const limit = numberParam(params, "limit", 50);
  const offset = numberParam(params, "offset", 0);
  if (path === "/api/v1/catalog/categories") {
    const table = params.get("kind") === "service" ? "service_categories" : "categories";
    return list(table, { order: "display_order.asc", limit, offset });
  }
  const children = path.match(/^\/api\/v1\/catalog\/categories\/([^/]+)\/children$/);
  if (children) {
    const table = params.get("kind") === "service" ? "service_categories" : "categories";
    const result = await list(table, {
      filters: { parent_id: `eq.${children[1]}` },
      order: "display_order.asc",
      limit,
      offset,
    });
    return rowsFromList(result);
  }
  if (path === "/api/v1/catalog/vendors") {
    return list("vendors", {
      filters: { status: "in.(active,verified)" },
      order: "created_at.desc",
      limit,
      offset,
    });
  }
  const vendorProducts = path.match(/^\/api\/v1\/catalog\/vendors\/([^/]+)\/products$/);
  if (vendorProducts) {
    return list("products", {
      filters: { vendor_id: `eq.${vendorProducts[1]}`, status: "eq.active" },
      order: "created_at.desc",
      limit,
      offset,
    });
  }
  const vendor = path.match(/^\/api\/v1\/catalog\/vendors\/([^/]+)$/);
  if (vendor) return single("vendors", vendor[1]);
  if (path === "/api/v1/catalog/browse/products") {
    const filters: Query = { status: "eq.active" };
    const category = params.get("subcategoryId") || params.get("categoryId");
    if (category) filters.or = `(category_id.eq.${category},subcategory_id.eq.${category},category_name.ilike.*${category}*)`;
    const q = params.get("q");
    if (q) filters.title = `ilike.*${q}*`;
    const sort = params.get("sort");
    const order = sort === "price_low" ? "price.asc" : sort === "price_high" ? "price.desc" : sort === "rating" ? "rating.desc" : "created_at.desc";
    return list("products", { filters, order, limit, offset });
  }
  const product = path.match(/^\/api\/v1\/catalog\/products\/([^/]+)$/);
  if (product) return single("products", product[1]);
  if (path === "/api/v1/catalog/services") {
    const filters: Query = { status: "eq.active" };
    const category = params.get("subcategoryId") || params.get("categoryId");
    if (category) filters.or = `(category_id.eq.${category},subcategory_id.eq.${category},category_name.ilike.*${category}*)`;
    const q = params.get("q");
    if (q) filters.title = `ilike.*${q}*`;
    return list("services", { filters, order: "created_at.desc", limit, offset });
  }
  const offers = path.match(/^\/api\/v1\/catalog\/browse\/services\/([^/]+)\/vendors$/);
  if (offers) {
    const service = await single("services", offers[1]);
    if (!Object.keys(service).length) return [];
    return [{
      vendorServiceId: service.id,
      price: String(service.price ?? 0),
      isAvailable: true,
      vendor: service.vendorId
        ? {
            id: String(service.vendorId),
            businessName: String(service.vendorName ?? "Service provider"),
            logoUrl: null,
            thumbnailUrl: null,
          }
        : null,
    }];
  }
  const service = path.match(/^\/api\/v1\/catalog\/services\/([^/]+)$/);
  if (service) return single("services", service[1]);
  if (path === "/api/v1/catalog/search") {
    const q = params.get("q")?.trim();
    const filters: Query = q ? { or: `(title.ilike.*${q}*,description.ilike.*${q}*)` } : {};
    const [products, services, vendors] = await Promise.all([
      list("products", { filters: { ...filters, status: "eq.active" }, limit, offset }),
      list("services", { filters: { ...filters, status: "eq.active" }, limit, offset }),
      list("vendors", { filters: q ? { business_name: `ilike.*${q}*` } : {}, limit, offset }),
    ]);
    return {
      products: rowsFromList(products),
      services: rowsFromList(services),
      vendors: rowsFromList(vendors),
    };
  }
  return undefined;
}

async function content(method: string, path: string, params: URLSearchParams, body?: unknown): Promise<unknown | undefined> {
  const limit = numberParam(params, "limit", 50);
  if (path === "/api/v1/content/banners") return list("banners", { filters: { status: "eq.active" }, order: "priority.desc", limit });
  if (path === "/api/v1/content/popups") return list("popup_banners", { filters: { status: "eq.active" }, order: "created_at.desc", limit });
  if (path === "/api/v1/content/featured-products") return list("products", { filters: { status: "eq.active" }, order: "created_at.desc", limit });
  if (path === "/api/v1/content/service-highlights") return list("services", { filters: { status: "eq.active" }, order: "created_at.desc", limit });
  if (path === "/api/v1/content/home") {
    const variables = await list("platform_variables", { filters: { key: "ilike.homepage_image_%" }, limit: 100 });
    const assets = Object.fromEntries(rowsFromList(variables).map((row) => [String(row.key), String(row.value ?? "")]));
    return { banners: [], popups: [], reels: [], classified: [], brands: [], featuredProducts: [], serviceHighlights: [], assets };
  }
  if (path === "/api/v1/content/reels") return list("social_posts", { filters: { status: "eq.published", post_type: "in.(reel,video)" }, order: "created_at.desc", limit });
  if (path === "/api/v1/content/classified") {
    if (method === "POST") {
      const input = asMap(body);
      const pending = {
        id: `AD-${Date.now()}`,
        title: input.name,
        description: input.description,
        price: input.price ?? 0,
        category: input.categoryId ?? "",
        ad_type: input.adType ?? "sell",
        city: input.city ?? "",
        area: input.area ?? "",
        state: input.state ?? "",
        pincode: input.pincode ?? "",
        condition: input.condition ?? "used_good",
        brand: input.brand ?? "",
        model: input.model ?? "",
        manufacture_year: input.manufactureYear ?? null,
        quantity: input.quantity ?? 1,
        negotiable: input.negotiable ?? true,
        warranty: input.warranty ?? false,
        invoice_available: input.invoiceAvailable ?? false,
        delivery_available: input.deliveryAvailable ?? false,
        seller_name: input.sellerName ?? "",
        contact_phone: input.contactPhone ?? "",
        preferred_contact: input.preferredContact ?? "phone_whatsapp",
        tags: input.tags ?? [],
        images: input.imageUrls ?? [],
        user_id: customerId(),
        user_name: input.sellerName ?? input.seller_name,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      try { return await insert("classified_ads", pending); }
      catch {
        const current = localJson<JsonMap[]>("p4u_classified_ads", []);
        setLocalJson("p4u_classified_ads", [pending, ...current]);
        return pending;
      }
    }
    const filters: Query = { status: "eq.approved" };
    const category = params.get("categoryId") || params.get("category");
    if (category) filters.category = `ilike.*${category}*`;
    const q = params.get("q");
    if (q) filters.title = `ilike.*${q}*`;
    return list("classified_ads", { filters, order: "created_at.desc", limit });
  }
  if (path === "/api/v1/content/classified/categories") {
    return { data: [], items: [], total: 0, limit, offset: 0 };
  }
  const classified = path.match(/^\/api\/v1\/content\/classified\/([^/]+)$/);
  if (classified) {
    const local = localJson<JsonMap[]>("p4u_classified_ads", []).find((row) => String(row.id) === classified[1]);
    return local ?? single("classified_ads", classified[1]);
  }
  if (path === "/api/v1/content/brands") return { data: [], items: [], total: 0, limit, offset: 0 };
  return undefined;
}

async function profile(method: string, path: string, body?: unknown): Promise<unknown | undefined> {
  const id = customerId();
  if (path === "/api/v1/profile/me") {
    if (!id) throw apiError(401, "Please login to continue.");
    if (method === "PATCH" || method === "PUT") {
      const input = asMap(body);
      const aliases: Record<string, string> = { fullName: "name", phone: "mobile", avatarUrl: "avatar_url" };
      const values = Object.fromEntries(Object.entries(input).map(([key, value]) => [aliases[key] ?? key, value]));
      return update("customers", id, values);
    }
    return single("customers", id);
  }
  if (path === "/api/v1/profile/me/addresses") {
    if (!id) throw apiError(401, "Please login to continue.");
    if (method === "POST") return insert("customer_addresses", { ...asMap(body), customer_id: id });
    return list("customer_addresses", { filters: { customer_id: `eq.${id}` } });
  }
  const address = path.match(/^\/api\/v1\/profile\/me\/addresses\/([^/]+)$/);
  if (address) {
    if (method === "DELETE") return remove("customer_addresses", { id: `eq.${address[1]}` });
    return update("customer_addresses", address[1], asMap(body));
  }
  if (path === "/api/v1/profile/me/wishlist") {
    if (!id) throw apiError(401, "Please login to continue.");
    const key = `p4u_wishlist_${id}`;
    const current = localJson<JsonMap[]>(key, []);
    if (method === "POST") {
      const productId = String(asMap(body).productId ?? "");
      if (!productId) throw apiError(400, "Product is required.");
      const existing = current.find((row) => String(row.productId) === productId);
      if (existing) return existing;
      const item = { id: `wish-${Date.now()}`, productId, createdAt: new Date().toISOString() };
      setLocalJson(key, [item, ...current]);
      return item;
    }
    return current;
  }
  const wishlistItem = path.match(/^\/api\/v1\/profile\/me\/wishlist\/([^/]+)$/);
  if (wishlistItem && method === "DELETE") {
    if (!id) throw apiError(401, "Please login to continue.");
    const key = `p4u_wishlist_${id}`;
    const current = localJson<JsonMap[]>(key, []);
    setLocalJson(key, current.filter((row) => String(row.productId) !== decodeURIComponent(wishlistItem[1])));
    return { deleted: true };
  }
  if (path === "/api/v1/profile/me/wallet" || path === "/api/v1/profile/me/reward-points") {
    if (!id) throw apiError(401, "Please login to continue.");
    const customer = await single("customers", id);
    const points = customer.walletPoints ?? 0;
    return { balance: points, points, walletPoints: points, transactions: [] };
  }
  if (path === "/api/v1/profile/me/referrals") {
    if (!id) throw apiError(401, "Please login to continue.");
    return list("referrals", { filters: { referrer_id: `eq.${id}` }, order: "created_at.desc" });
  }
  return undefined;
}

async function social(method: string, path: string, body?: unknown): Promise<unknown | undefined> {
  if (path === "/api/v1/social/public/health") return { status: "ok" };
  if (path === "/api/v1/social/feed" || path === "/api/v1/social/feed/public") {
    const feed = await list("social_posts", { filters: { status: "eq.published" }, order: "created_at.desc", limit: 50 });
    return hydrateSocialList(feed);
  }
  if (path === "/api/v1/social/posts" && method === "POST") {
    const input = asMap(body);
    const mediaUrls = Array.isArray(input.mediaUrls) ? input.mediaUrls : [];
    return insert("social_posts", {
      user_id: authUserId(),
      content: String(input.contentText ?? input.content ?? ""),
      media_urls: mediaUrls,
      post_type: input.postType ?? (mediaUrls.length ? "image" : "text"),
      visibility: input.visibility ?? "public",
      location: input.location ?? null,
      status: "published",
      metadata: {
        category: input.category ?? "general",
        tags: input.tags ?? [],
        linkedProducts: input.linkedProducts ?? [],
        hideLikeCount: input.hideLikeCount ?? false,
        commentPermission: input.commentPermission ?? "everyone",
      },
    });
  }
  if (path === "/api/v1/social/feed/ads") return [];
  if (path === "/api/v1/social/feed/ad-config") return { adEveryN: 5, mode: "admin_only" };
  if (path === "/api/v1/social/explore/tags" || path === "/api/v1/social/explore/places") return [];
  if (path === "/api/v1/social/users/suggestions") {
    const customers = await list("customers", { order: "created_at.desc", limit: 30 }).catch(() => ({ data: [] }));
    return rowsFromList(customers)
      .filter((customer) => String(customer.id ?? "") !== String(customerId() ?? ""))
      .map((customer) => ({ id: customer.id, userId: customer.id, name: customer.fullName ?? customer.name ?? "Planext user", userName: customer.username ?? customer.fullName ?? customer.name, avatar: customer.avatarUrl ?? null, avatarUrl: customer.avatarUrl ?? null, isFollowing: false }));
  }
  if (path === "/api/v1/social/users/me/profile") {
    const id = String(customerId() ?? "");
    const mine: JsonMap = await single("customers", id).catch(() => ({}));
    if (method === "PATCH") {
      const input = asMap(body);
      const metadata = { ...asMap(mine.metadata), socioDisplayName: input.displayName, socioUsername: input.username, socioBio: input.bio, socioWebsite: input.website, socioPronouns: input.pronouns, socioLocation: input.location, socioCategory: input.category, socioAccountType: input.accountType, socioAvatarUrl: input.avatarUrl, socioIsPrivate: input.isPrivate };
      const saved = await update("customers", id, { name: input.displayName, bio: input.bio, avatar_url: input.avatarUrl, metadata });
      return socialProfileWithCounts(saved, input);
    }
    return socialProfileWithCounts(mine);
  }
  const userProfile = path.match(/^\/api\/v1\/social\/users\/([^/]+)\/profile$/);
  if (userProfile) {
    const customer = await customerByIdentity(userProfile[1]);
    return socialProfileWithCounts(customer);
  }
  const userPosts = path.match(/^\/api\/v1\/social\/users\/([^/]+)\/posts$/);
  if (userPosts) {
    const customer = await customerByIdentity(userPosts[1]);
    const ownerId = String(customer.supabaseUid ?? userPosts[1]);
    const posts = await list("social_posts", { filters: { user_id: `eq.${ownerId}` }, order: "created_at.desc", limit: 50 }).catch(() => ({ data: [] }));
    return hydrateSocialList(posts);
  }
  const comments = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/comments$/);
  if (comments) {
    if (method === "POST") return insert("social_comments", { post_id: comments[1], user_id: authUserId(), content: asMap(body).contentText ?? asMap(body).content ?? "", status: "active" });
    return hydrateSocialList(await list("social_comments", { filters: { post_id: `eq.${comments[1]}` }, order: "created_at.asc" }));
  }
  const like = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/like$/);
  if (like) {
    const user = authUserId();
    if (method === "DELETE") return remove("social_likes", { post_id: `eq.${like[1]}`, user_id: `eq.${user}` });
    return insert("social_likes", { post_id: like[1], user_id: user, reaction_type: "like" });
  }
  const savedPost = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/save$/);
  if (savedPost) {
    const ids = new Set(localJson<string[]>("p4u_socio_saved_posts", []));
    if (method === "DELETE") ids.delete(savedPost[1]); else ids.add(savedPost[1]);
    setLocalJson("p4u_socio_saved_posts", [...ids]);
    return { ok: true };
  }
  if (path === "/api/v1/social/posts/saved") {
    const ids = localJson<string[]>("p4u_socio_saved_posts", []);
    const rows = await Promise.all(ids.map((id) => single("social_posts", id).catch(() => ({}))));
    const data = rows.filter((row) => Object.keys(row).length);
    return hydrateSocialList({ data, items: data, total: data.length });
  }
  const share = path.match(/^\/api\/v1\/social\/posts\/([^/]+)\/(share|repost)$/);
  if (share) return { postId: share[1], sharedBy: authUserId(), ok: true };
  const post = path.match(/^\/api\/v1\/social\/posts\/([^/]+)$/);
  if (post) {
    if (method === "DELETE") return remove("social_posts", { id: `eq.${post[1]}`, user_id: `eq.${authUserId()}` });
    const item = await single("social_posts", post[1]);
    const hydrated = await hydrateSocialList({ data: [item], items: [item], total: 1 });
    return rowsFromList(hydrated)[0] ?? {};
  }
  const follow = path.match(/^\/api\/v1\/social\/users\/([^/]+)\/follow$/);
  if (follow) {
    if (method === "DELETE") return remove("social_follows", { follower_id: `eq.${authUserId()}`, following_id: `eq.${follow[1]}` }).catch(() => ({ ok: true }));
    return insert("social_follows", { follower_id: authUserId(), following_id: follow[1] }).catch(() => ({ ok: true }));
  }
  const connections = path.match(/^\/api\/v1\/social\/users\/([^/]+)\/(followers|following)$/);
  if (connections) {
    const target = connections[1];
    const followerMode = connections[2] === "followers";
    const rows = await list("social_follows", { filters: followerMode ? { following_id: `eq.${target}` } : { follower_id: `eq.${target}` }, limit: 100 }).catch(() => ({ data: [] }));
    const ids = rowsFromList(rows).map((row) => String(followerMode ? row.followerId : row.followingId)).filter(Boolean);
    const users = await Promise.all(ids.map(customerByIdentity));
    return users.map((customer) => ({ id: customer.id, userId: customer.id, name: customer.fullName ?? customer.name ?? "Planext user", userName: customer.username ?? customer.fullName ?? customer.name, avatar: customer.avatarUrl ?? null, isFollowing: false }));
  }
  if (path === "/api/v1/social/stories/feed" || path === "/api/v1/social/stories/me") {
    const filters: Query = path.endsWith("/me") ? { user_id: `eq.${authUserId()}` } : {};
    const stories = await hydrateSocialList(await list("social_stories", { filters, order: "created_at.desc", limit: 50 }));
    return rowsFromList(stories);
  }
  if (path === "/api/v1/social/stories" && method === "POST") {
    const input = asMap(body);
    return insert("social_stories", { user_id: authUserId(), media_url: input.mediaUrl, media_type: input.mediaType ?? "image", caption: input.caption ?? input.textOverlay ?? "", status: "active", expires_at: new Date(Date.now() + 86_400_000).toISOString() });
  }
  const storyAction = path.match(/^\/api\/v1\/social\/stories\/([^/]+)(?:\/(view|like))?$/);
  if (storyAction) {
    if (method === "DELETE") return remove("social_stories", { id: `eq.${storyAction[1]}`, user_id: `eq.${authUserId()}` });
    return { ok: true };
  }
  if (path === "/api/v1/social/users/me/settings") {
    const current = localJson<JsonMap>("p4u_socio_settings", {});
    if (method === "PATCH") {
      const incoming = asMap(body);
      const next = {
        ...current,
        ...incoming,
        notifications: { ...asMap(current.notifications), ...asMap(incoming.notifications) },
        privacy: { ...asMap(current.privacy), ...asMap(incoming.privacy) },
        messaging: { ...asMap(current.messaging), ...asMap(incoming.messaging) },
        security: { ...asMap(current.security), ...asMap(incoming.security) },
      };
      setLocalJson("p4u_socio_settings", next);
      return next;
    }
    return current;
  }
  if (path === "/api/v1/social/notifications/me") {
    const notifications = await list("social_notifications", { filters: { user_id: `eq.${authUserId()}` }, order: "created_at.desc" });
    const data = await Promise.all(rowsFromList(notifications).map(async (row) => {
      const actorId = String(row.actorId ?? "");
      const actor = actorId ? await customerByIdentity(actorId) : {};
      return { ...row, actorId, actorName: row.actorName ?? actor.fullName ?? actor.name ?? "Planext user", actorAvatar: row.actorAvatar ?? actor.avatarUrl ?? null };
    }));
    return { ...notifications, data, items: data, total: data.length };
  }
  if (path === "/api/v1/social/messages/conversations") {
    if (method === "POST") {
      const participantId = String(asMap(body).participantId ?? "");
      return insert("social_conversations", { participant_id: participantId, created_by: authUserId(), last_message_at: new Date().toISOString() });
    }
    return list("social_conversations", { order: "last_message_at.desc" });
  }
  const messages = path.match(/^\/api\/v1\/social\/messages\/conversations\/([^/]+)\/messages$/);
  if (messages) {
    if (method === "POST") return insert("social_messages", { conversation_id: messages[1], sender_id: authUserId(), content: asMap(body).content ?? "", media_url: asMap(body).mediaUrl ?? null, media_type: asMap(body).mediaType ?? null });
    return list("social_messages", { filters: { conversation_id: `eq.${messages[1]}` }, order: "created_at.asc" });
  }
  if (/^\/api\/v1\/social\/messages\/conversations\/[^/]+\/(read|typing)$/.test(path)) return { ok: true };
  if (path === "/api/v1/social/calls") return method === "GET" ? [] : { id: `local-${Date.now()}`, status: "ringing", ...asMap(body) };
  return undefined;
}

async function commerce(method: string, path: string, body?: unknown, params = new URLSearchParams()): Promise<unknown | undefined> {
  const cartKey = `p4u_direct_cart_${customerId() ?? "guest"}`;
  const cartItems = localJson<JsonMap[]>(cartKey, []);
  const cartResponse = (items: JsonMap[]) => ({
    id: `local-cart-${customerId() ?? "guest"}`,
    items,
    subtotal: items.reduce((sum, item) => sum + Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 0), 0).toFixed(2),
    totalAmount: items.reduce((sum, item) => sum + Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 0), 0),
  });
  if (path === "/api/v1/commerce/cart") {
    if (method === "DELETE") { setLocalJson(cartKey, []); return { ok: true }; }
    if (method === "PUT") {
      const next = asRows(asMap(body).items).map((item, index) => ({ ...item, id: String(item.id ?? `local-line-${index}-${item.productId ?? Date.now()}`) }));
      setLocalJson(cartKey, next);
      return cartResponse(next);
    }
    return cartResponse(cartItems);
  }
  if (path === "/api/v1/commerce/cart/merge" && method === "POST") {
    const incoming = asRows(asMap(body).items);
    const next = [...cartItems];
    incoming.forEach((item, index) => {
      const key = `${item.productId ?? ""}:${item.variationId ?? ""}`;
      const existing = next.findIndex((row) => `${row.productId ?? ""}:${row.variationId ?? ""}` === key);
      const normalized = { ...item, id: String(existing >= 0 ? next[existing].id : `local-line-${Date.now()}-${index}`) };
      if (existing >= 0) next[existing] = normalized; else next.push(normalized);
    });
    setLocalJson(cartKey, next);
    return cartResponse(next);
  }
  if (path === "/api/v1/commerce/cart/items" && method === "POST") {
    const item = asMap(body);
    const key = `${item.productId ?? ""}:${item.variationId ?? ""}`;
    const existing = cartItems.findIndex((row) => `${row.productId ?? ""}:${row.variationId ?? ""}` === key);
    const next = [...cartItems];
    if (existing >= 0) next[existing] = { ...next[existing], quantity: Number(next[existing].quantity ?? 0) + Number(item.quantity ?? 1) };
    else next.push({ ...item, id: `local-line-${Date.now()}` });
    setLocalJson(cartKey, next);
    return cartResponse(next);
  }
  const cartItem = path.match(/^\/api\/v1\/commerce\/cart\/items\/([^/]+)$/);
  if (cartItem) {
    const index = cartItems.findIndex((row) => String(row.id) === decodeURIComponent(cartItem[1]));
    if (method === "DELETE") {
      const next = index >= 0 ? cartItems.filter((_, itemIndex) => itemIndex !== index) : cartItems;
      setLocalJson(cartKey, next); return cartResponse(next);
    }
    if (method === "PATCH" && index >= 0) {
      const next = [...cartItems]; next[index] = { ...next[index], ...asMap(body) };
      setLocalJson(cartKey, next); return cartResponse(next);
    }
    return cartResponse(cartItems);
  }
  const localPropertyKey = "p4u_property_listings";
  const localProperties = localJson<JsonMap[]>(localPropertyKey, []);
  if (path === "/api/v1/commerce/properties/mine") {
    const id = customerId();
    if (!id) return [];
    return localProperties.filter((row) => String(row.customer_id ?? "") === id);
  }
  if (path === "/api/v1/commerce/properties/estimate" && method === "POST") {
    const input = asMap(body);
    const city = String(input.city ?? "").trim().toLowerCase();
    const prices = localProperties
      .filter((row) => String(row.status ?? "").toLowerCase() === "approved")
      .filter((row) => !city || String(row.city ?? "").toLowerCase().includes(city))
      .map((row) => Number(row.price ?? 0)).filter((value) => value > 0).sort((a,b) => a-b);
    if (!prices.length) return { low: 0, average: 0, high: 0, sampleSize: 0 };
    return { low: prices[0], average: prices.reduce((sum,value) => sum + value, 0) / prices.length, high: prices[prices.length - 1], sampleSize: prices.length };
  }
  if (path === "/api/v1/commerce/properties") {
    if (method === "POST") {
      const pending = { id: `property-${Date.now()}`, ...asMap(body), customer_id: customerId(), status: "pending", created_at: new Date().toISOString() };
      setLocalJson(localPropertyKey, [pending, ...localProperties]);
      return pending;
    }
    const type = String(params.get("type") ?? "").toLowerCase();
    const propertyType = String(params.get("propertyType") ?? "").toLowerCase();
    const q = String(params.get("q") ?? "").toLowerCase();
    const rows = localProperties
      .filter((row) => String(row.status ?? "").toLowerCase() === "approved")
      .filter((row) => !type || String(row.transaction_type ?? row.transactionType ?? "").toLowerCase() === type)
      .filter((row) => !propertyType || String(row.property_type ?? row.propertyType ?? "").toLowerCase().includes(propertyType))
      .filter((row) => !q || [row.title,row.city,row.locality].join(" ").toLowerCase().includes(q))
      .slice(0, numberParam(params,"limit",100));
    return { data: rows, items: rows, total: rows.length, limit: rows.length, offset: 0 };
  }
  const inquiry = path.match(/^\/api\/v1\/commerce\/properties\/([^/]+)\/inquiries$/);
  if (inquiry && method === "POST") {
    const key = "p4u_property_messages";
    const current = localJson<JsonMap[]>(key, []);
    const message = { id:`message-${Date.now()}`, property_id:inquiry[1], customer_id:customerId(), message:asMap(body).message, status:"open", created_at:new Date().toISOString() };
    setLocalJson(key, [message, ...current]);
    return message;
  }
  const property = path.match(/^\/api\/v1\/commerce\/properties\/([^/]+)$/);
  if (property) {
    const localIndex = localProperties.findIndex((row) => String(row.id) === property[1]);
    if (method === "PATCH") {
      if (localIndex >= 0) {
        const updated = { ...localProperties[localIndex], ...asMap(body), updated_at: new Date().toISOString() };
        const next = [...localProperties]; next[localIndex] = updated; setLocalJson(localPropertyKey, next); return updated;
      }
      return {};
    }
    if (method === "DELETE") {
      if (localIndex >= 0) setLocalJson(localPropertyKey, localProperties.filter((_, index) => index !== localIndex));
      return { deleted:true };
    }
    if (localIndex >= 0) return localProperties[localIndex];
    return {};
  }
  if (path === "/api/v1/commerce/property-saved-searches") {
    const current = localJson<JsonMap[]>("p4u_property_saved_searches", []);
    if (method === "POST") { const next = [{ id:`search-${Date.now()}`, ...asMap(body), created_at:new Date().toISOString() }, ...current]; setLocalJson("p4u_property_saved_searches", next); return next[0]; }
    return current;
  }
  if (path === "/api/v1/commerce/property-messages") {
    return localJson<JsonMap[]>("p4u_property_messages", []).filter((row) => !customerId() || String(row.customer_id ?? "") === String(customerId()));
  }
  if (path === "/api/v1/commerce/property-rent-trackers") {
    const current = localJson<JsonMap[]>("p4u_property_rent_trackers", []);
    if (method === "PUT") { const input=asMap(body); const next=[{id:`rent-${Date.now()}`,property_name:input.propertyName,monthly_rent:input.monthlyRent,paid_months:input.paidMonths??[]},...current]; setLocalJson("p4u_property_rent_trackers",next); return next[0]; }
    return current;
  }
  const orders = path.match(/^\/api\/v1\/commerce\/customers\/([^/]+)\/orders$/);
  if (orders) return list("orders", { filters: { customer_id: `eq.${orders[1]}` }, order: "created_at.desc" });
  const order = path.match(/^\/api\/v1\/commerce\/orders\/([^/]+)$/);
  if (order) return single("orders", order[1]);
  if (path === "/api/v1/commerce/bookings") {
    const id = customerId();
    if (!id) throw apiError(401, "Please login to continue.");
    if (method === "POST") return insert("service_bookings", { ...asMap(body), customer_id: id });
    return list("service_bookings", { filters: { customer_id: `eq.${id}` }, order: "created_at.desc" });
  }
  if (path === "/api/v1/commerce/reviews") {
    const current = localJson<JsonMap[]>("p4u_product_reviews", []);
    if (method === "POST") {
      const input = asMap(body);
      const row: JsonMap = {
        id: `review-${Date.now()}`,
        targetType: input.targetType,
        targetId: input.targetId,
        rating: Number(input.rating || 0),
        comment: input.reviewText ?? input.comment ?? "",
        title: input.title ?? "",
        imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls : [],
        userId: customerId() || "customer",
        createdAt: new Date().toISOString(),
      };
      setLocalJson("p4u_product_reviews", [row, ...current]);
      return row;
    }
    const targetType = params.get("targetType");
    const targetId = params.get("targetId");
    return current.filter((row) => (!targetType || String(row.targetType) === targetType) && (!targetId || String(row.targetId) === targetId));
  }
  return undefined;
}

export async function supabaseRequest<T>(method: string, pathWithQuery: string, body?: unknown): Promise<T> {
  const parsed = new URL(pathWithQuery, "https://p4u.local");
  const path = parsed.pathname;
  const params = parsed.searchParams;

  if (path.endsWith("/public/health")) return { ok: true, status: "ok" } as T;
  if (path === "/api/auth/public/occupations") return { items: [] } as T;
  if (path === "/api/auth/public/phone/exchange") return phoneAuth(String(asMap(body).idToken ?? "")) as Promise<T>;
  if (path === "/api/auth/public/customer/register-by-phone") {
    const input = asMap(body);
    return phoneAuth(String(input.registrationToken ?? ""), true, input) as Promise<T>;
  }
  if (path === "/api/auth/public/refresh") return refresh(String(asMap(body).refreshToken ?? "")) as Promise<T>;
  if (path === "/api/auth/logout") {
    await raw("POST", "/auth/v1/logout", {}, undefined, true);
    return { ok: true, message: "Logged out" } as T;
  }

  const result =
    (await catalog(path, params)) ??
    (await content(method, path, params, body)) ??
    (await profile(method, path, body)) ??
    (await social(method, path, body)) ??
    (await commerce(method, path, body, params));

  if (result !== undefined) return result as T;
  throw apiError(503, "This feature is temporarily unavailable while the service reconnects.");
}
