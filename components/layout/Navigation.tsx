"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Settings, Video, FileText } from "lucide-react";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/service", label: "Services", icon: Settings },
  { href: "/socio", label: "Socio", icon: Video },
  { href: "/classified", label: "Classified", icon: FileText },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-y border-[#D7E7F5] bg-[#EAF4FF]">
      <div className="mx-auto max-w-7xl bg-white  px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 w-full border ${
                  active
                    ? "bg-[#89CFF0] border-[#89CFF0] text-white shadow-[0_10px_24px_rgba(137,207,240,.2)]"
                    : "bg-white border-[#D7E7F5] hover:-translate-y-0.5 hover:border-[#B8E3F7] text-[#7A879B]"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                <span className="font-medium text-base">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
