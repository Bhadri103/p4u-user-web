/**
 * Centralised HTTP client that talks to the P4U API Gateway.
 *
 * Every service module (catalog, content, …) imports `apiClient` and
 * calls its convenience methods instead of using raw `fetch`.
 */

/** Empty env string would otherwise produce relative `/api/...` URLs on :3000 with no rewrite. */
const BASE_URL = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080").replace(
  /\/$/,
  "",
);

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

interface RequestInternalOptions {
  skipAuthHeader?: boolean;
  skipAuthRefresh?: boolean;
  retry401?: boolean;
  retryTransient?: boolean;
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
  const { refresh } = tokenSnapshot();
  if (!refresh) throw new Error("No refresh token");
  const url = `${BASE_URL}/api/auth/public/refresh`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { message: raw };
  }
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: data?.message ?? res.statusText ?? "Refresh failed",
      details: data,
    };
    throw err;
  }
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

export async function ensureTokenFresh(): Promise<void> {
  const { access, refresh } = tokenSnapshot();
  if (!access || !refresh) return;
  const expMs = decodeJwtExpMs(access);
  if (expMs != null && expMs - Date.now() > 120_000) return;
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  await refreshInFlight;
}

/* ------------------------------------------------------------------ */
/*  Core request function                                              */
/* ------------------------------------------------------------------ */

async function request<T>(
  path: string,
  options: RequestInit = {},
  internal: RequestInternalOptions = {},
): Promise<T> {
  const { skipAuthHeader = false, skipAuthRefresh = false, retry401 = false, retryTransient = false } = internal;
  const url = `${BASE_URL}${path}`;

  if (!skipAuthRefresh) {
    try {
      await ensureTokenFresh();
    } catch {
      // Keep existing session; request/refresh may recover later.
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(skipAuthHeader ? {} : authHeaders()),
    ...(options.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e: unknown) {
    if (!retryTransient) {
      await new Promise((r) => setTimeout(r, 800));
      return request<T>(path, options, { ...internal, retryTransient: true });
    }
    const msg = e instanceof Error ? e.message : String(e);
    const err: ApiError = {
      status: 0,
      message:
        msg === "Failed to fetch"
          ? "Network error: could not reach the API. Confirm the gateway is running and NEXT_PUBLIC_API_GATEWAY_URL matches (e.g. http://localhost:8080)."
          : msg || "Network request failed",
      details: e,
    };
    throw err;
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
        await refreshAccessToken();
        return request<T>(path, options, { ...internal, retry401: true });
      } catch {
        // Preserve local session; explicit logout remains user-driven.
      }
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
    params?: Record<string, string | number | boolean>,
    options?: GetOptions,
  ) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ).toString()
      : "";
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

  prefetchGet(path: string, params?: Record<string, string | number | boolean>, options?: GetOptions) {
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
