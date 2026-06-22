"use client";
import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/lib/api/auth";
import type { ApiError } from "@/lib/api/client";
import { ensureTokenFresh } from "@/lib/api/client";
import {
  resolveCustomerIdFromAccessToken,
  displayNameFromAccessToken,
} from "@/lib/resolveCustomerId";

interface AuthContextType {
  isLoggedIn: boolean;
  loggedPhone: string;
  displayName: string;
  isLoading: boolean;
  token: string | null;
  /**
   * Sync session state into the context after AuthModal / register flow has
   * already written tokens to localStorage. Called from `handleAuthSuccess`.
   */
  login: (phone: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Milliseconds until access token `exp`, or null if JWT unreadable. */
function accessTokenExpiresAtMs(accessToken: string): number | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return payload.exp != null ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem("p4u_loggedIn");
  localStorage.removeItem("p4u_phone");
  localStorage.removeItem("p4u_token");
  localStorage.removeItem("p4u_refresh_token");
  localStorage.removeItem("p4u_token_expires_in");
  localStorage.removeItem("p4u_customer_id");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedPhone, setLoggedPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const syncDisplayName = (accessToken: string | null, phone: string) => {
    setDisplayName(displayNameFromAccessToken(accessToken, phone || null));
  };

  const applySessionFromStorage = useCallback(() => {
    const savedToken = localStorage.getItem("p4u_token");
    const refresh = localStorage.getItem("p4u_refresh_token");
    if (!savedToken && !refresh) return false;

    const phone = localStorage.getItem("p4u_phone") || "";
    localStorage.setItem("p4u_loggedIn", "true");
    setIsLoggedIn(true);
    setLoggedPhone(phone);
    setToken(savedToken);
    if (savedToken) {
      const cid =
        localStorage.getItem("p4u_customer_id") || resolveCustomerIdFromAccessToken(savedToken);
      if (cid) localStorage.setItem("p4u_customer_id", cid);
    }
    syncDisplayName(savedToken, phone);
    return true;
  }, []);

  const syncSessionFromStorage = useCallback(() => {
    applySessionFromStorage();
  }, [applySessionFromStorage]);

  useEffect(() => {
    let cancelled = false;

    const runInit = async () => {
      const hasSession = applySessionFromStorage();
      if (!hasSession) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const refresh = localStorage.getItem("p4u_refresh_token");
      if (refresh) {
        try {
          await ensureTokenFresh();
          if (!cancelled) {
            const updated = localStorage.getItem("p4u_token");
            setToken(updated);
            const phone = localStorage.getItem("p4u_phone") || "";
            syncDisplayName(updated, phone);
          }
        } catch (e: unknown) {
          const status =
            typeof e === "object" && e !== null && "status" in e ? (e as ApiError).status : -1;
          if (status === 401 || status === 403) {
            clearStoredSession();
            if (!cancelled) {
              setIsLoggedIn(false);
              setLoggedPhone("");
              setToken(null);
              setDisplayName("");
            }
          }
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    void runInit();
    return () => {
      cancelled = true;
    };
  }, [applySessionFromStorage]);

  useEffect(() => {
    const sync = () => syncSessionFromStorage();
    window.addEventListener("p4u-token-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("p4u-token-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [syncSessionFromStorage]);

  // Auto-refresh access token before Keycloak expiry.
  useEffect(() => {
    if (!token) return;

    const applyTokens = (res: Awaited<ReturnType<typeof authApi.refreshToken>>) => {
      localStorage.setItem("p4u_token", res.accessToken);
      localStorage.setItem("p4u_refresh_token", res.refreshToken);
      localStorage.setItem("p4u_token_expires_in", String(res.expiresIn));
      localStorage.setItem("p4u_loggedIn", "true");
      const customerId =
        res.customerId != null && String(res.customerId).trim() !== ""
          ? String(res.customerId)
          : resolveCustomerIdFromAccessToken(res.accessToken);
      if (customerId) localStorage.setItem("p4u_customer_id", customerId);
      setToken(res.accessToken);
      const phone = localStorage.getItem("p4u_phone") || "";
      syncDisplayName(res.accessToken, phone);
    };

    const runRefresh = async (isRetryAfterNetworkFailure: boolean) => {
      const refreshToken = localStorage.getItem("p4u_refresh_token");
      if (!refreshToken) return;
      try {
        const res = await authApi.refreshToken(refreshToken);
        applyTokens(res);
      } catch (e: unknown) {
        const status = typeof e === "object" && e !== null && "status" in e ? (e as ApiError).status : -1;
        if (status === 401 || status === 403) {
          clearStoredSession();
          setIsLoggedIn(false);
          setLoggedPhone("");
          setToken(null);
          setDisplayName("");
          return;
        }
        if (status === 0 && !isRetryAfterNetworkFailure) {
          setTimeout(() => {
            void runRefresh(true);
          }, 15_000);
          return;
        }
        setTimeout(() => {
          void runRefresh(true);
        }, 60_000);
      }
    };

    const expMs = accessTokenExpiresAtMs(token);
    const expiresInFallback = Number(localStorage.getItem("p4u_token_expires_in") || "300");
    const now = Date.now();
    let delayMs: number;
    if (expMs != null) {
      delayMs = expMs - now - 45_000;
      if (delayMs < 5_000) delayMs = Math.min(5_000, Math.max(0, expMs - now - 5_000));
      if (expMs - now < 90_000) delayMs = 0;
    } else {
      delayMs = Math.max((expiresInFallback - 45) * 1000, 10_000);
    }

    const timeout = setTimeout(() => {
      void runRefresh(false);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [token]);

  /**
   * Called by AuthModal / register page after Keycloak tokens were already
   * stored into localStorage. We just lift them into React state.
   */
  function login(phone: string) {
    localStorage.setItem("p4u_loggedIn", "true");
    localStorage.setItem("p4u_phone", phone);
    setIsLoggedIn(true);
    setLoggedPhone(phone);
    const existing = localStorage.getItem("p4u_token");
    if (existing) {
      setToken(existing);
      const cid =
        localStorage.getItem("p4u_customer_id") || resolveCustomerIdFromAccessToken(existing);
      if (cid) localStorage.setItem("p4u_customer_id", cid);
      syncDisplayName(existing, phone);
    } else {
      syncDisplayName(null, phone);
    }
  }

  function logout() {
    const refreshToken = localStorage.getItem("p4u_refresh_token");
    if (refreshToken && token) {
      authApi.logout(refreshToken).catch(() => {});
    }
    setIsLoggedIn(false);
    setLoggedPhone("");
    setToken(null);
    setDisplayName("");
    clearStoredSession();
  }

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, loggedPhone, displayName, isLoading, token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
