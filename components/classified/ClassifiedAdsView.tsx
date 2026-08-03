"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, Search, Tag } from "lucide-react";
import { classifiedApi, type ClassifiedAd, type ClassifiedCategory } from "@/lib/api/classified";
import { loadClassifiedCategories } from "@/lib/classified/categories";
import { formatClassifiedInr, formatClassifiedShortDate } from "@/lib/classified/format";
import { resolveMediaUrl } from "@/lib/media";

const THEME = "#89CFF0";

function AdCard({ ad, onOpen }: { ad: ClassifiedAd; onOpen: (ad: ClassifiedAd) => void }) {
  const image = resolveMediaUrl(ad.image || ad.images?.[0]) || "/images/placeholder-product.png";
  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      className="group flex w-full items-start gap-3 overflow-hidden rounded-[22px] border border-[#D7E7F5] bg-white p-2.5 text-left shadow-[0_7px_24px_rgba(32,33,36,.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#B9D4EA] hover:shadow-[0_12px_32px_rgba(32,33,36,.11)] max-[420px]:flex-col sm:gap-4 sm:p-3"
    >
      <div className="h-[106px] w-[106px] shrink-0 overflow-hidden rounded-2xl bg-[#F2F7FA] max-[420px]:h-44 max-[420px]:w-full sm:h-[132px] sm:w-[148px]">
        <img
          src={image}
          alt={ad.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/images/placeholder-product.png";
          }}
        />
      </div>
      <div className="flex min-h-[106px] min-w-0 flex-1 flex-col py-1 sm:min-h-[132px] sm:py-1.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#202124] sm:text-base">{ad.title}</h3>
        {ad.categoryName ? (
          <span className="mt-1.5 inline-flex w-fit items-center gap-1 text-xs font-medium text-[#7A879B]">
            <Tag className="h-3.5 w-3.5" />
            {ad.categoryName}
          </span>
        ) : null}
        <span className="mt-2 text-base font-semibold text-[#202124] sm:text-lg">{formatClassifiedInr(ad.price)}</span>
        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7A879B] sm:text-xs">
          {ad.location ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{ad.location}</span>
            </span>
          ) : null}
          {ad.createdAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatClassifiedShortDate(ad.createdAt)}
            </span>
          ) : null}
        </div>
      </div>
      <span className="self-center rounded-full border border-[#D7E7F5] bg-[#F7FBFF] p-1.5 text-[#7A879B] transition group-hover:translate-x-0.5 group-hover:border-[#B9D4EA] max-[420px]:hidden" aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

export default function ClassifiedAdsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const categoryRailRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: -1 | 1) => {
    categoryRailRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  useEffect(() => {
    setActiveCategory(searchParams.get("category") || "");
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listResult, categoryResult] = await Promise.allSettled([
        classifiedApi.list({
          q: searchQuery || undefined,
          categoryId: activeCategory || undefined,
          limit: 60,
          offset: 0,
          forceRefresh: true,
        }),
        loadClassifiedCategories({ forceRefresh: true }),
      ]);
      const remoteAds = listResult.status === "fulfilled" ? listResult.value.items : [];
      setAds(remoteAds);
      setCategories(categoryResult.status === "fulfilled" ? categoryResult.value : []);
      if (listResult.status === "rejected") {
        const message = listResult.reason instanceof Error ? listResult.reason.message : "";
        setError(message || "Failed to load classified ads");
      }
    } catch (reason: unknown) {
      setAds([]);
      setError(reason && typeof reason === "object" && "message" in reason ? String(reason.message) : "Failed to load classified ads");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryPills = useMemo(() => [{ id: "", name: "All" }, ...categories], [categories]);

  return (
    <div className=" px-4 py-5 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl bg-white  flex-col rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-[0_18px_60px_rgba(32,33,36,0.07)] sm:p-6">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#202124] md:text-4xl">Classifieds</h1>
          <p className="mt-1 text-sm font-medium text-[#202124] md:text-base">Great finds around you</p>
          <p className="mt-1 text-xs text-[#7A879B] md:text-sm">Discover quality listings from your community</p>
        </div>
        <Link href="/classified/post" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95" style={{ backgroundColor: THEME }}>
          <Plus className="h-4 w-4" />
          Post Ad Free
        </Link>
      </div>

      <div className="z-10 -mx-2 mb-3 shrink-0 rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-sm backdrop-blur">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A879B]" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search classifieds"
          className="h-12 w-full rounded-xl border border-[#D7E7F5] bg-white pl-11 pr-4 text-sm text-[#202124] outline-none transition focus:border-[#8FB8DE] focus:ring-2 focus:ring-[#DDEEFF]"
        />
      </div>

      <div className="relative mb-3 shrink-0">
        <button
          type="button"
          aria-label="Scroll categories left"
          onClick={() => scrollCategories(-1)}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7E7F5] bg-white text-[#5D687A] shadow-md transition hover:border-[#B9D4EA] hover:bg-[#F7FBFF]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div
          ref={categoryRailRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain px-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categoryPills.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id || "all"}
                type="button"
                onClick={() => {
                  const next = category.id ? `/classified?category=${encodeURIComponent(category.id)}` : "/classified";
                  setActiveCategory(category.id);
                  router.replace(next);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "text-white shadow-sm" : "border border-[#D7E7F5] bg-white text-[#5D687A] hover:bg-[#F7FBFF]"}`}
                style={active ? { backgroundColor: THEME } : undefined}
              >
                {category.name}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Scroll categories right"
          onClick={() => scrollCategories(1)}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#D7E7F5] bg-white text-[#5D687A] shadow-md transition hover:border-[#B9D4EA] hover:bg-[#F7FBFF]"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 px-1 pb-2">
      {error ? <div className="mx-auto mb-4 max-w-5xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[130px] animate-pulse rounded-[22px] bg-[#F2F7FA] sm:h-[158px]" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="mx-auto max-w-5xl rounded-[22px] border border-dashed border-[#D7E7F5] bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[#202124]">No ads found</p>
          <p className="mt-2 text-sm text-[#7A879B]">Post the first classified ad.</p>
          <Link href="/classified/post" className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: THEME }}>
            <Plus className="h-4 w-4" />
            Post Ad Free
          </Link>
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-4 xl:grid-cols-2">
          {ads.map((ad) => <AdCard key={ad.id} ad={ad} onOpen={(row) => router.push(`/classified/${row.id}`)} />)}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
