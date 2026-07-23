"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Megaphone,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useEffect, useRef } from "react";

const modules = [
  { href: "/shop", label: "Shop", icon: ShoppingBag, matches: ["/shop", "/product", "/cart"] },
  { href: "/food", label: "Food", icon: UtensilsCrossed, matches: ["/food"] },
  { href: "/service", label: "Services", icon: Wrench, matches: ["/service"] },
  { href: "/find-home", label: "Homes", icon: Building2, matches: ["/find-home"] },
  { href: "/socio", label: "Socio", icon: Users, matches: ["/socio"] },
  { href: "/classified", label: "Classifieds", icon: Megaphone, matches: ["/classified"] },
] as const;

function matchesPath(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export default function CustomerModuleDock() {
  const pathname = usePathname() || "/";
  const railItems = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeModule = modules.findIndex((item) => matchesPath(pathname, item.matches));
  const dashboardActive = pathname === "/home";

  useEffect(() => {
    if (activeModule < 0) return;
    railItems.current[activeModule]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeModule]);

  if (pathname === "/") return null;

  return (
    <>
      <div className="h-[calc(72px+env(safe-area-inset-bottom))] md:hidden" aria-hidden />
      <nav
        aria-label="Customer modules"
        className="fixed inset-x-0 bottom-0 z-[1200] border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.10)] md:hidden"
      >
        <div className="flex h-[72px] pb-[env(safe-area-inset-bottom)]">
          <Link
            href="/home"
            className={`flex w-1/5 shrink-0 flex-col items-center justify-center border-r border-slate-200 text-[10px] font-bold transition-colors ${
              dashboardActive ? "text-teal-700" : "text-slate-600"
            }`}
            aria-current={dashboardActive ? "page" : undefined}
          >
            <LayoutDashboard className="mb-1 h-5 w-5" strokeWidth={dashboardActive ? 2.6 : 2} />
            <span>Dashboard</span>
            <span className={`mt-1 h-0.5 rounded-full bg-teal-600 transition-all ${dashboardActive ? "w-5" : "w-0"}`} />
          </Link>

          <div className="flex w-4/5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {modules.map(({ href, label, icon: Icon, matches }, index) => {
              const active = matchesPath(pathname, matches);
              return (
                <Link
                  key={href}
                  ref={(element) => {
                    railItems.current[index] = element;
                  }}
                  href={href}
                  className={`flex w-1/4 shrink-0 flex-col items-center justify-center text-[10px] font-bold transition-colors ${
                    active ? "text-teal-700" : "text-slate-600"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="mb-1 h-5 w-5" strokeWidth={active ? 2.6 : 2} />
                  <span className="max-w-full truncate px-1">{label}</span>
                  <span className={`mt-1 h-0.5 rounded-full bg-teal-600 transition-all ${active ? "w-5" : "w-0"}`} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

