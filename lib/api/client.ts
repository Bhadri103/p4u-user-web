/**
 * Centralised HTTP client that talks to the P4U API Gateway.
 *
 * Every service module (catalog, content, â€¦) imports `apiClient` and
 * calls its convenience methods instead of using raw `fetch`.
 */

/** Empty env string would otherwise produce relative `/api/...` URLs on :3000 with no rewrite. */
import { supabaseRequest, USE_SUPABASE_DIRECT } from "./supabaseFallback";

const BASE_URL = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080").replace(
  /\/$/,
  "",
);
const REQUEST_TIMEOUT_MS = 10_000;
const DEBUG_API = process.env.NEXT_PUBLIC_P4U_DEBUG_API === "true";
const AUTH_GATEWAY_FALLBACK_PATHS = new Set([
  "/api/auth/public/phone/exchange",
  "/api/auth/public/customer/register-by-phone",
]);

function canUseAuthGatewayFallback(path: string, status: number) {
  return AUTH_GATEWAY_FALLBACK_PATHS.has(path)
    && (status === 0 || status === 404 || status === 408 || status === 429 || status >= 500);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

interface ErrorEnvelope {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

interface GetOptions {
  /** Cache successful GET responses for this duration. Defaults to 30s. */
  cacheTtlMs?: number;
  /** Skip cache lookup and force a network request. */
  forceRefresh?: boolean;
}

type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface RequestInternalOptions {
  skipAuthHeader?: boolean;
  skipAuthRefresh?: boolean;
  retry401?: boolean;
  retryTransient?: boolean;
  /** When true, 401 does not clear session (optional profile probes). */
  softAuthFailure?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_GET_CACHE_TTL_MS = 30_000;
const getResponseCache = new Map<string, { expiresAt: number; value: unknown }>();
const inflightGetRequests = new Map<string, Promise<unknown>>();

function makeGetCacheKey(pathWithQuery: string): string {
  const token = typeof window !== "undefined" ? localStorage.getItem("p4u_token") ?? "" : "";
  return `${pathWithQuery}::${token}`;
}

function cloneJsonSafe<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function queryString(params?: QueryParams): string {
  if (!params) return "";
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => [key, String(value)] as [string, string]);
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : "";
}

/* ------------------------------------------------------------------ */
/*  Token helper                                                       */
/* ------------------------------------------------------------------ */

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("p4u_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function decodeJwtExpMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<void> | null = null;
/** After any failed refresh, block further attempts until the user signs in again. */
let refreshSessionDead = false;
/** Pause refresh after rate-limit to avoid hammering the server. */
let refreshBlockedUntil = 0;

/** Call after a successful login so background refresh can run again. */
export function resetRefreshSessionState() {
  refreshSessionDead = false;
  refreshBlockedUntil = 0;
  refreshInFlight = null;
}

function clearUserSessionOnRefreshFailure() {
  refreshSessionDead = true;
  refreshBlockedUntil = Date.now() + 300_000;
  // Keep persistent auth storage intact here. Only explicit logout should clear
  // tokens/localStorage; startup and protected-route checks can decide whether
  // the stored refresh token is genuinely unusable and show login without
  // causing SMS OTP on browser refresh/network blips.
}

function tokenSnapshot() {
  if (typeof window === "undefined") return { access: null as string | null, refresh: null as string | null };
  return {
    access: localStorage.getItem("p4u_token"),
    refresh: localStorage.getItem("p4u_refresh_token"),
  };
}

function broadcastTokenUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("p4u-token-updated"));
  }
}

function extractHttpErrorMessage(
  status: number,
  statusText: string,
  parsed: unknown,
  rawText: string,
): string {
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
    const errObj = o.error;
    if (errObj && typeof errObj === "object" && "message" in errObj) {
      const m = (errObj as { message?: string }).message;
      if (typeof m === "string" && m.trim()) return m.trim();
    }
  }
  const flat = rawText.replace(/\s+/g, " ").trim();
  if (/network response was not ok/i.test(flat)) {
    return "API request failed before reaching the service. Confirm the gateway is running and NEXT_PUBLIC_API_GATEWAY_URL matches (e.g. http://localhost:8080).";
  }
  if (flat && !flat.startsWith("<") && flat.length < 400) return flat.slice(0, 300);
  return `Request failed (HTTP ${status}${statusText ? ` ${statusText}` : ""}). Check that the API gateway is running${BASE_URL ? ` at ${BASE_URL}` : ""}.`;
}

async function refreshAccessToken(): Promise<void> {
  if (refreshSessionDead) {
    throw { status: 401, message: "Session expired" } satisfies ApiError;
  }
  if (Date.now() < refreshBlockedUntil) {
    throw { status: 429, message: "Refresh paused. Please sign in again." } satisfies ApiError;
  }
  const { refresh } = tokenSnapshot();
  if (!refresh) {
    clearUserSessionOnRefreshFailure();
    throw { status: 401, message: "No refresh token" } satisfies ApiError;
  }
  let data: Record<string, unknown> | null = null;
  if (USE_SUPABASE_DIRECT) {
    try {
      data = await supabaseRequest<Record<string, unknown>>(
        "POST",
        "/api/auth/public/refresh",
        { refreshToken: refresh },
      );
    } catch (error) {
      const directError = error as Partial<ApiError>;
      const directStatus = directError.status ?? 0;
      if (directError.status === 429) refreshBlockedUntil = Date.now() + 300_000;
      clearUserSessionOnRefreshFailure();
      throw {
        status: directError.status ?? 401,
        message: directError.message || "Refresh failed",
        details: directError.details,
      } satisfies ApiError;
    }
  } else {
    const url = `${BASE_URL}/api/auth/public/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const raw = await res.text();
    try {
      data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg =
        data?.message != null
          ? String(data.message)
          : extractHttpErrorMessage(res.status, res.statusText, data, raw);
      if (res.status === 429) refreshBlockedUntil = Date.now() + 300_000;
      clearUserSessionOnRefreshFailure();
      throw {
        status: res.status,
        message: typeof msg === "string" && msg.trim() ? msg : "Refresh failed",
        details: data ?? raw,
      } satisfies ApiError;
    }
  }
  refreshSessionDead = false;
  refreshBlockedUntil = 0;
  const accessToken = data?.accessToken ?? data?.access_token;
  const refreshToken = data?.refreshToken ?? data?.refresh_token;
  const expiresIn = data?.expiresIn ?? data?.expires_in;
  if (!accessToken) throw new Error("Refresh response missing access token");
  if (typeof window !== "undefined") {
    localStorage.setItem("p4u_token", String(accessToken));
    if (refreshToken) localStorage.setItem("p4u_refresh_token", String(refreshToken));
    if (expiresIn != null) localStorage.setItem("p4u_token_expires_in", String(expiresIn));
  }
  broadcastTokenUpdate();
}

async function refreshAccessTokenDeduped(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
}

/**
 * Refresh only once the access token is close to expiring. Keycloak access
 * tokens in this deployment live ~5 min, so a wide window (e.g. 5 min) would
 * refresh a brand-new token on the very first request after login â€” and if that
 * refresh of a just-minted token fails, the fresh session is killed and the user
 * is bounced to login. Keep the window small so healthy tokens are left alone.
 */
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

export async function ensureTokenFresh(): Promise<void> {
  const { access, refresh } = tokenSnapshot();
  if (!refresh) return;
  if (refreshSessionDead || Date.now() < refreshBlockedUntil) return;
  const expMs = access ? decodeJwtExpMs(access) : null;
  if (access && expMs != null && expMs - Date.now() > REFRESH_BEFORE_EXPIRY_MS) return;
  await refreshAccessTokenDeduped();
}

/* ------------------------------------------------------------------ */
/*  Core request function                                              */
/* ------------------------------------------------------------------ */

async function request<T>(
  path: string,
  options: RequestInit = {},
  internal: RequestInternalOptions = {},
): Promise<T> {
  const {
    skipAuthHeader = false,
    skipAuthRefresh = false,
    retry401 = false,
    retryTransient = false,
    softAuthFailure = false,
  } = internal;
  const url = `${BASE_URL}${path}`;

  if (!skipAuthRefresh) {
    try {
      await ensureTokenFresh();
    } catch {
      if (!tokenSnapshot().access && !softAuthFailure) {
        throw { status: 401, message: "Session expired" } satisfies ApiError;
      }
    }
  }

  if (USE_SUPABASE_DIRECT) {
    let body: unknown;
    if (typeof options.body === "string" && options.body) {
      try {
        body = JSON.parse(options.body) as unknown;
      } catch {
        body = options.body;
      }
    }
    try {
      return await supabaseRequest<T>(options.method ?? "GET", path, body);
    } catch (error) {
      const directError = error as Partial<ApiError>;
      const directStatus = directError.status ?? 0;
      if (DEBUG_API) {
        // A direct-service failure is surfaced to the calling UI and may be
        // recovered by its offline/sample fallback. Keep it out of Next's
        // development error overlay, which treats console.error as an app crash.
        console.warn("[P4U direct API]", path, directError.status, directError.message);
      }
      if (directStatus === 401 && !skipAuthRefresh && !retry401) {
        try {
          await refreshAccessTokenDeduped();
          return request<T>(path, options, { ...internal, retry401: true });
        } catch {
          if (!softAuthFailure) clearUserSessionOnRefreshFailure();
          throw { status: 401, message: "Session expired" } satisfies ApiError;
        }
      }
      if (!canUseAuthGatewayFallback(path, directStatus)) {
        throw {
          status: directStatus,
          message: directError.message || "Planext4u request failed",
          details: directError.details,
        } satisfies ApiError;
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(skipAuthHeader ? {} : authHeaders()),
    ...(options.headers as Record<string, string> | undefined),
  };

  let res: Response;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const externalSignal = options.signal;
  const abortFromExternal = () => timeoutController.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  try {
    res = await fetch(url, { ...options, headers, signal: timeoutController.signal });
  } catch (e: unknown) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    if (!retryTransient && !timedOut) {
      await new Promise((r) => setTimeout(r, 800));
      return request<T>(path, options, { ...internal, retryTransient: true });
    }
    const msg = e instanceof Error ? e.message : String(e);
    const err: ApiError = {
      status: 0,
      message:
        timedOut
          ? "The Planext4u service is taking too long to respond. Please try again."
          : msg === "Failed to fetch"
          ? "Network error: could not reach the API. Confirm the gateway is running and NEXT_PUBLIC_API_GATEWAY_URL matches (e.g. http://localhost:8080)."
          : msg || "Network request failed",
      details: e,
    };
    throw err;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }

  if (!res.ok) {
    const rawText = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      parsed = {};
    }
    if ((res.status === 502 || res.status === 503) && !retryTransient) {
      await new Promise((r) => setTimeout(r, 600));
      return request<T>(path, options, { ...internal, retryTransient: true });
    }
    if (res.status === 401 && !skipAuthRefresh && !retry401) {
      try {
        await refreshAccessTokenDeduped();
        return request<T>(path, options, { ...internal, retry401: true });
      } catch {
        if (!softAuthFailure) clearUserSessionOnRefreshFailure();
        throw {
          status: 401,
          message: "Session expired",
        } satisfies ApiError;
      }
    }
    if (res.status === 401 && retry401 && !softAuthFailure) {
      clearUserSessionOnRefreshFailure();
      throw {
        status: 401,
        message: "Session expired",
      } satisfies ApiError;
    }
    const envelopeError =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as unknown as ErrorEnvelope).error
        : undefined;
    const msg =
      envelopeError?.message ??
      (typeof (parsed as { message?: string }).message === "string"
        ? (parsed as { message: string }).message
        : undefined) ??
      extractHttpErrorMessage(res.status, res.statusText, parsed, rawText);
    const err: ApiError = {
      status: res.status,
      message: msg,
      details: parsed,
    };
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as unknown;
  if (body && typeof body === "object" && "success" in body) {
    const envelope = body as SuccessEnvelope<unknown> | ErrorEnvelope;
    if ((envelope as ErrorEnvelope).success === false) {
      const err: ApiError = {
        status: res.status,
        message: (envelope as ErrorEnvelope).error?.message ?? "Request failed",
        details: body,
      };
      throw err;
    }
    const ok = envelope as SuccessEnvelope<unknown>;
    const data = ok.data;
    const meta = ok.meta;
    if (
      meta != null &&
      typeof meta === "object" &&
      typeof meta.total === "number" &&
      Array.isArray(data)
    ) {
      return {
        data,
        total: meta.total,
        limit: typeof meta.limit === "number" ? meta.limit : data.length,
        offset: typeof meta.offset === "number" ? meta.offset : 0,
      } as T;
    }
    return data as T;
  }
  return body as T;
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                     */
/* ------------------------------------------------------------------ */

export const apiClient = {
  get<T>(
    path: string,
    params?: QueryParams,
    options?: GetOptions,
  ) {
    const query = queryString(params);
    const pathWithQuery = path + query;
    const key = makeGetCacheKey(pathWithQuery);
    const forceRefresh = Boolean(options?.forceRefresh);
    const ttlMs = options?.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
    const now = Date.now();

    if (!forceRefresh) {
      const hit = getResponseCache.get(key);
      if (hit && hit.expiresAt > now) {
        return Promise.resolve(cloneJsonSafe(hit.value as T));
      }
      const pending = inflightGetRequests.get(key);
      if (pending) return pending.then((v) => cloneJsonSafe(v as T));
    }

    const req = request<T>(pathWithQuery)
      .then((result) => {
        if (DEBUG_API) {
          const value = result as unknown as { data?: unknown[]; items?: unknown[] };
          console.info("[P4U API]", pathWithQuery, Array.isArray(value?.data) ? value.data.length : Array.isArray(value?.items) ? value.items.length : "ok");
        }
        if (ttlMs > 0) {
          getResponseCache.set(key, {
            expiresAt: Date.now() + ttlMs,
            value: cloneJsonSafe(result),
          });
        }
        return cloneJsonSafe(result);
      })
      .finally(() => {
        inflightGetRequests.delete(key);
      });

    inflightGetRequests.set(key, req as Promise<unknown>);
    return req;
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },

  postInternal<T>(path: string, body?: unknown, internal?: RequestInternalOptions) {
    return request<T>(
      path,
      {
        method: "POST",
        body: body != null ? JSON.stringify(body) : undefined,
      },
      internal,
    );
  },

  prefetchGet(path: string, params?: QueryParams, options?: GetOptions) {
    return this.get(path, params, options).then(() => undefined);
  },

  clearGetCache(pathPrefix?: string) {
    if (!pathPrefix) {
      getResponseCache.clear();
      inflightGetRequests.clear();
      return;
    }
    for (const key of getResponseCache.keys()) {
      if (key.startsWith(pathPrefix)) getResponseCache.delete(key);
    }
    for (const key of inflightGetRequests.keys()) {
      if (key.startsWith(pathPrefix)) inflightGetRequests.delete(key);
    }
  },
};



