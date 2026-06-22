"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { contentApi, type Banner } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";

function isLive(startDate?: string, endDate?: string): boolean {
  const now = Date.now();
  const s = startDate ? new Date(startDate).getTime() : NaN;
  const e = endDate ? new Date(endDate).getTime() : NaN;
  if (!Number.isNaN(s) && now < s) return false;
  if (!Number.isNaN(e) && now > e) return false;
  return true;
}

function toHref(b: Banner): string {
  const m = b.metadata || {};
  const direct = String(m.ctaLink || b.redirectUrl || "").trim();
  if (direct) return direct;
  const linkType = String(m.linkType || "").toLowerCase();
  const linkTarget = String(m.linkTarget || m.redirectId || "").trim();
  if (!linkTarget) return "";
  if (linkType === "product_category") return `/shop?categoryId=${encodeURIComponent(linkTarget)}`;
  if (linkType === "service") return `/service?serviceId=${encodeURIComponent(linkTarget)}`;
  return `/${encodeURIComponent(linkTarget)}`;
}

function goTo(href: string) {
  if (!href) return;
  if (href.startsWith("/")) {
    window.location.href = href;
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export default function HomepageCmsBlocks() {
  const [items, setItems] = useState<Banner[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [videoDismissed, setVideoDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    contentApi
      .getBanners()
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

  const contentSections = useMemo(
    () =>
      items
        .filter((b) => {
          const m = b.metadata || {};
          if (b.isActive === false) return false;
          if (m.homepageCMS !== true) return false;
          if ((m.cmsSlot || "hero") !== "content") return false;
          return isLive(m.startDate, m.endDate);
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [items],
  );

  const videoAd = useMemo(
    () =>
      items
        .filter((b) => {
          const m = b.metadata || {};
          if (b.isActive === false) return false;
          if (m.homepageCMS !== true) return false;
          if ((m.cmsSlot || "hero") !== "video") return false;
          if ((m.mediaType || "video") !== "video") return false;
          if (!m.videoUrl) return false;
          return isLive(m.startDate, m.endDate);
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0] || null,
    [items],
  );

  useEffect(() => {
    if (!videoAd || videoDismissed) {
      setShowVideo(false);
      return;
    }
    const delay = Number(videoAd.metadata?.showAfterSeconds || 0);
    const timer = window.setTimeout(() => setShowVideo(true), Math.max(0, delay) * 1000);
    return () => window.clearTimeout(timer);
  }, [videoAd, videoDismissed]);

  return (
    <>
      {contentSections.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 xl:px-6 mt-3 md:mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentSections.map((s) => {
            const m = s.metadata || {};
            const href = toHref(s);
            const imgRaw = m.desktopImageUrl || s.imageUrl || s.image;
            const img =
              typeof imgRaw === "string" && imgRaw.trim()
                ? resolveMediaUrl(imgRaw.trim()) || imgRaw.trim()
                : imgRaw;
            return (
              <article
                key={String(s.id)}
                className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
                style={{
                  backgroundColor: m.themeBgColor || undefined,
                  background: m.backgroundGradient || undefined,
                }}
              >
                {img ? (
                  <div className="relative w-full h-40">
                    <Image src={img} alt={s.title || "Content section"} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 33vw" />
                  </div>
                ) : null}
                <div className="p-4">
                  {m.festivalTag ? (
                    <span className="inline-block mb-2 text-xs px-2 py-1 rounded-full bg-black/10">{m.festivalTag}</span>
                  ) : null}
                  <h3 className="text-lg font-semibold" style={{ color: m.themeHeaderColor || undefined }}>
                    {s.title}
                  </h3>
                  {m.subtitle ? <p className="text-sm text-gray-700 mt-1">{m.subtitle}</p> : null}
                  {m.ctaText && href ? (
                    <button
                      type="button"
                      className="mt-3 px-4 py-2 rounded-md text-sm font-semibold"
                      style={{ backgroundColor: m.themeButtonColor || "#0ea5a4", color: "#fff" }}
                      onClick={() => goTo(href)}
                    >
                      {m.ctaText}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {videoAd && showVideo && !videoDismissed && (() => {
        const m = videoAd.metadata || {};
        const mode = String(m.displayMode || "inline").toLowerCase();
        const href = toHref(videoAd);
        const containerCls =
          mode === "floating_pip"
            ? "fixed bottom-4 right-4 z-[950] w-[300px] sm:w-[360px] bg-white rounded-xl shadow-2xl border"
            : "mx-auto max-w-[1400px] px-4 xl:px-6 mt-4";
        const posterRaw = m.thumbnailUrl || videoAd.imageUrl;
        const posterResolved =
          typeof posterRaw === "string" && posterRaw.trim()
            ? resolveMediaUrl(posterRaw.trim()) || posterRaw.trim()
            : undefined;
        return (
          <section className={containerCls}>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setVideoDismissed(true);
                  setShowVideo(false);
                }}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1"
                aria-label="Close video ad"
              >
                <X className="w-4 h-4" />
              </button>
              <video
                src={String(m.videoUrl)}
                poster={posterResolved}
                controls
                autoPlay={Boolean(m.autoExpandFullscreen)}
                muted
                playsInline
                className="w-full rounded-xl"
              />
              {m.ctaText && href ? (
                <button
                  type="button"
                  onClick={() => goTo(href)}
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md text-sm font-semibold bg-teal-600 text-white"
                >
                  {m.ctaText}
                </button>
              ) : null}
            </div>
          </section>
        );
      })()}
    </>
  );
}

