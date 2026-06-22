"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Settings, Video, Calendar, FileText } from "lucide-react";

const items = [
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/service", label: "Services", icon: Settings },
  { href: "/socio", label: "Socio", icon: Video },
  { href: "/booking", label: "Booking", icon: Calendar },
  { href: "/classified", label: "Classified", icon: FileText },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-[#e8f4f8]">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors w-full border ${
                  active
                    ? "bg-[#17a2b8] border-[#17a2b8] text-white shadow-sm"
                    : "bg-white border-transparent hover:bg-gray-50 text-[#17a2b8]"
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