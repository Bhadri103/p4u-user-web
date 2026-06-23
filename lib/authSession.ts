import { resetRefreshSessionState } from "@/lib/api/client";

const KEYS = {
  loggedIn: "p4u_loggedIn",
  phone: "p4u_phone",
  access: "p4u_token",
  refresh: "p4u_refresh_token",
  expiresIn: "p4u_token_expires_in",
  customerId: "p4u_customer_id",
} as const;

export function clearUserAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.loggedIn);
  localStorage.removeItem(KEYS.phone);
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
  localStorage.removeItem(KEYS.expiresIn);
  localStorage.removeItem(KEYS.customerId);
}

export function hasValidAccessToken(): boolean {
  if (typeof window === "undefined") return false;
  const access = localStorage.getItem(KEYS.access);
  if (!access) return false;
  try {
    const part = access.split(".")[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export function persistUserAuthTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  customerId?: string | null,
  phone?: string | null,
) {
  if (typeof window === "undefined") return;
  resetRefreshSessionState();
  localStorage.setItem(KEYS.loggedIn, "true");
  localStorage.setItem(KEYS.access, accessToken);
  localStorage.setItem(KEYS.refresh, refreshToken);
  localStorage.setItem(KEYS.expiresIn, String(expiresIn));
  if (customerId) localStorage.setItem(KEYS.customerId, customerId);
  if (phone) localStorage.setItem(KEYS.phone, phone);
  window.dispatchEvent(new CustomEvent("p4u-token-updated"));
}
