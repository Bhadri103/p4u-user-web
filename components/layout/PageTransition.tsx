"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!main || reduceMotion) return;

    document.documentElement.classList.add("ui-motion-ready");
    main.classList.remove("ui-route-enter");
    // Restart the opacity-only route animation without moving the header or page.
    void main.offsetWidth;
    main.classList.add("ui-route-enter");
    const routeTimer = window.setTimeout(() => main.classList.remove("ui-route-enter"), 280);

    return () => {
      window.clearTimeout(routeTimer);
    };
  }, [pathname]);

  return (
    <div className="app-page-transition">
      {children}
    </div>
  );
}
