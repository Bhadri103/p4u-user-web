"use client";
import { createContext, useCallback, useContext, useState, useEffect, ReactNode } from "react";
import type { ApiError } from "@/lib/api/client";
import { ensureTokenFresh } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
import {
  clearUserAuthStorage,
  hasValidAccessToken,
  persistUserAuthTokens,
} from "@/lib/authSession";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedPhone, setLoggedPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const syncDisplayName = (accessToken: string | null, phone: string) => {
    setDisplayName(displayNameFromAccessToken(accessToken, phone || null));
  };

  const clearSessionState = useCallback(() => {
    clearUserAuthStorage();
    setIsLoggedIn(false);
    setLoggedPhone("");
    setToken(null);
    setDisplayName("");
  }, []);

  const applySessionFromStorage = useCallback(() => {
    const savedToken = localStorage.getItem("p4u_token");
    const refresh = localStorage.getItem("p4u_refresh_token");
    if (!savedToken && !refresh) {
      clearSessionState();
      return false;
    }
    if (savedToken && !hasValidAccessToken() && !refresh) {
      clearSessionState();
      return false;
    }

    const phone = localStorage.getItem("p4u_phone") || "";
    localStorage.setItem("p4u_loggedIn", "true");
    setIsLoggedIn(true);
    setLoggedPhone(phone);
    setToken(hasValidAccessToken() ? savedToken : null);
    if (savedToken && hasValidAccessToken()) {
      const cid =
        localStorage.getItem("p4u_customer_id") || resolveCustomerIdFromAccessToken(savedToken);
      if (cid) localStorage.setItem("p4u_customer_id", cid);
    }
    syncDisplayName(hasValidAccessToken() ? savedToken : null, phone);
    return true;
  }, [clearSessionState]);

  const syncSessionFromStorage = useCallback(() => {
    const hasRefresh = Boolean(localStorage.getItem("p4u_refresh_token"));
    const hasAccess = hasValidAccessToken();
    if (!hasRefresh && !hasAccess) {
      clearSessionState();
      return;
    }
    applySessionFromStorage();
  }, [applySessionFromStorage, clearSessionState]);

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
            if (!updated || !hasValidAccessToken()) {
              clearSessionState();
            } else {
              setToken(updated);
              const phone = localStorage.getItem("p4u_phone") || "";
              syncDisplayName(updated, phone);
            }
          }
        } catch (e: unknown) {
          const status =
            typeof e === "object" && e !== null && "status" in e ? (e as ApiError).status : -1;
          if (status === 401 || status === 403 || status === 429) {
            if (!cancelled) clearSessionState();
          }
        }
      } else if (!hasValidAccessToken()) {
        if (!cancelled) clearSessionState();
      }

      if (!cancelled) setIsLoading(false);
    };

    void runInit();
    return () => {
      cancelled = true;
    };
  }, [applySessionFromStorage, clearSessionState]);

  useEffect(() => {
    const sync = () => syncSessionFromStorage();
    window.addEventListener("p4u-token-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("p4u-token-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [syncSessionFromStorage]);

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
    if (existing && hasValidAccessToken()) {
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
    clearSessionState();
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
