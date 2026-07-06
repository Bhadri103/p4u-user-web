"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Plus, Search } from "lucide-react";
import { classifiedApi, type ClassifiedAd, type ClassifiedCategory } from "@/lib/api/classified";
import { formatClassifiedInr, formatClassifiedShortDate } from "@/lib/classified/format";
import { resolveMediaUrl } from "@/lib/media";

const TEAL = "#17a2b8";

function excerpt(text: string | null | undefined, max = 120): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max).trim()}…`;
}

function AdCard({ ad, onOpen }: { ad: ClassifiedAd; onOpen: (ad: ClassifiedAd) => void }) {
  const image = resolveMediaUrl(ad.image) || "/images/placeholder-product.png";
  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={ad.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop";
          }}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900">{ad.title}</h3>
          <span className="shrink-0 text-base font-bold" style={{ color: TEAL }}>
            {formatClassifiedInr(ad.price)}
          </span>
        </div>
        {ad.description ? (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-500">{excerpt(ad.description)}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {ad.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {ad.location}
            </span>
          ) : null}
          {ad.createdAt ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatClassifiedShortDate(ad.createdAt)}
            </span>
          ) : null}
        </div>
        {ad.categoryName ? (
          <span className="mt-3 inline-flex w-fit rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
            {ad.categoryName}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function ClassifiedAdsView() {
  const router = useRouter();
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, catRes] = await Promise.all([
        classifiedApi.list({
          q: searchQuery || undefined,
          categoryId: activeCategory || undefined,
          limit: 60,
          offset: 0,
        }),
        classifiedApi.categories(),
      ]);
      setAds(listRes.items);
      setCategories(catRes.items);
    } catch (e: unknown) {
      setAds([]);
      setError(e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load classified ads");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryPills = useMemo(
    () => [{ id: "", name: "All" }, ...categories],
    [categories],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Classifieds</h1>
          <p className="mt-1 text-sm text-gray-500 md:text-base">Buy &amp; sell locally</p>
        </div>
        <Link
          href="/classified/post"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ backgroundColor: TEAL }}
        >
          <Plus className="h-4 w-4" />
          Post Ad Free
        </Link>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search classifieds..."
          className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm outline-none ring-[#17a2b8] transition focus:border-[#17a2b8] focus:ring-2"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {categoryPills.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id || "all"}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? "text-white shadow-sm" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={active ? { backgroundColor: TEAL } : undefined}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-gray-700">No classified ads found</p>
          <p className="mt-2 text-sm text-gray-500">Try another search or post the first ad in this category.</p>
          <Link
            href="/classified/post"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            <Plus className="h-4 w-4" />
            Post Ad Free
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} onOpen={(row) => router.push(`/classified/${row.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
