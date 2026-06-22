"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type Ctx = {
  runWithLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  startLoading: () => void;
  stopLoading: () => void;
};

const AppLoadingContext = createContext<Ctx | null>(null);

export function useAppLoading(): Ctx {
  const ctx = useContext(AppLoadingContext);
  if (!ctx) throw new Error("useAppLoading must be used within AppLoadingProvider");
  return ctx;
}

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const startLoading = useCallback(() => {}, []);
  const stopLoading = useCallback(() => {}, []);

  const runWithLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    return fn();
  }, []);

  const ctxValue = useMemo(
    () => ({ runWithLoading, startLoading, stopLoading }),
    [runWithLoading, startLoading, stopLoading],
  );

  return (
    <AppLoadingContext.Provider value={ctxValue}>{children}</AppLoadingContext.Provider>
  );
}
