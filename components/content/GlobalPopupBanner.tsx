"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { contentApi, type Popup } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";

const DISMISSED_SESSION_KEY = "p4u.popup.dismissed";

function parseDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(DISMISSED_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISMISSED_SESSION_KEY, JSON.stringify(ids));
}

function isWithinWindow(p: Popup): boolean {
  const now = Date.now();
  const fromMs = p.validFrom ? new Date(p.validFrom).getTime() : NaN;
  const toMs = p.validTo ? new Date(p.validTo).getTime() : NaN;
  if (!Number.isNaN(fromMs) && now < fromMs) return false;
  if (!Number.isNaN(toMs) && now > toMs) return false;
  return true;
}

function screenAliases(pathname: string): string[] {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "/home") return ["splash screen", "home", "menu"];
  if (p.startsWith("/service")) return ["services"];
  if (p.startsWith("/shop")) return ["menu", "shop"];
  if (p.startsWith("/social")) return ["social media", "newsfeed"];
  if (p.startsWith("/wallet")) return ["wallets"];
  if (p.startsWith("/profile")) return ["profile"];
  return [p.replace("/", "")];
}

function shouldShowOnPath(popup: Popup, pathname: string): boolean {
  const meta = popup.metadata || {};
  const appType = String(meta.appType || "").trim().toLowerCase();
  if (appType && appType !== "user") return false;
  const sid = String(meta.screenId || "").trim().toLowerCase();
  if (!sid) return true;
  return screenAliases(pathname).includes(sid);
}

export default function GlobalPopupBanner() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [items, setItems] = useState<Popup[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setDismissed(parseDismissed());
  }, []);

  useEffect(() => {
    let cancelled = false;
    contentApi
      .getPopups()
      .then((rows) => {
        if (cancelled) return;
        setItems(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => {
    const filtered = items.filter((p) => {
      if (p.isActive === false) return false;
      if (!isWithinWindow(p)) return false;
      if (!shouldShowOnPath(p, pathname)) return false;
      if (dismissed.includes(String(p.id))) return false;
      return Boolean(p.imageUrl || p.image);
    });
    return filtered[0] || null;
  }, [items, pathname, dismissed]);

  useEffect(() => {
    setOpen(true);
  }, [selected?.id]);

  if (!selected || !open) return null;

  const rawImage = selected.imageUrl || selected.image || "";
  const imageUrl = typeof rawImage === "string" && rawImage.trim() ? resolveMediaUrl(rawImage.trim()) || rawImage.trim() : rawImage;
  const title = selected.title || "Promotion";
  const redirectUrl = String(selected.redirectUrl || "").trim();

  const dismiss = () => {
    const id = String(selected.id);
    const next = dismissed.includes(id) ? dismissed : [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
    setOpen(false);
  };

  const onBannerClick = () => {
    if (!redirectUrl) return;
    if (redirectUrl.startsWith("/")) {
      router.push(redirectUrl);
      dismiss();
      return;
    }
    window.location.href = redirectUrl;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1 text-gray-700 hover:text-black"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onBannerClick}
          className="w-full text-left"
          disabled={!redirectUrl}
          aria-label={title}
        >
          <div className="relative w-full aspect-[4/5]">
            <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 90vw, 420px" />
          </div>
        </button>
      </div>
    </div>
  );
}

