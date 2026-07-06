"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wrench, SlidersHorizontal, ChevronRight, ChevronDown, Navigation,
  Star, Clock, MapPin, Heart, X, Loader2,
} from "lucide-react";
import { PER_PAGE, Seller } from "./serviceData";
import { catalogApi, type Category, type ServiceItem } from "@/lib/api/catalog";
import { pickServiceImage, pickCategoryImage } from "@/lib/media";
import { addServiceWishlist, getServiceWishlist, removeServiceWishlist } from "@/lib/serviceWishlist";

const TEAL = "#009999";

const SORT_OPTIONS = [
  { value: "nearest", label: "Nearest First" },
  { value: "low", label: "Price: Low to High" },
  { value: "high", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
] as const;

function formatInr(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: T[] }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

function normalizeCategoryToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/* ------------------------------------------------------------------ */
/*  Category pill + subcategory circle                                 */
/* ------------------------------------------------------------------ */

function CategoryPill({
  label, image, active, isAll = false, onClick,
}: { label: string; image: string | null; active: boolean; isAll?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border py-2 pl-2 pr-4 text-sm font-medium transition ${
        active ? "border-transparent text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      }`}
      style={active ? { background: TEAL } : undefined}
    >
      {isAll ? (
        <span className="pl-2">{label}</span>
      ) : (
        <>
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function SubCircle({
  label, image, active, onClick,
}: { label: string; image: string | null; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center outline-none">
      <span
        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-white transition-all ${
          active ? "border-[#009999] shadow-[0_6px_16px_rgba(0,153,153,0.18)]" : "border-slate-200 group-hover:border-[#7fd0ce]"
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="h-full w-full bg-slate-100" />
        )}
      </span>
      <span className={`block w-full truncate text-[11px] leading-tight ${active ? "font-semibold text-[#009999]" : "font-medium text-slate-600"}`}>
        {label}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Service card                                                       */
/* ------------------------------------------------------------------ */

function ServiceCard({ s, fav, onToggleFav, onClick, busy }: {
  s: Seller; fav: boolean; onToggleFav: (s: Seller) => void; onClick: () => void; busy?: boolean;
}) {
  const img = s.image?.trim() || "";
  const locationText = s.distance || s.city || "";
  return (
    <div
      onClick={busy ? undefined : onClick}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition ${busy ? "cursor-wait opacity-70" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
        )}
        {s.offerPercent && s.offerPercent > 0 ? (
          <span className="absolute left-3 top-3 rounded-md bg-rose-500 px-2 py-1 text-[11px] font-bold text-white shadow">{s.offerPercent}% OFF</span>
        ) : null}
        {s.isNew ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> New
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFav(s); }}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-2">
          {s.provider ? <span className="text-xs font-medium lowercase" style={{ color: TEAL }}>{s.provider}</span> : null}
          {s.available ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Available</span> : null}
        </div>
        <h3 className="text-[17px] font-bold leading-snug text-gray-900">{s.title}</h3>
        {s.description ? <p className="mt-0.5 truncate text-sm text-gray-500">{s.description}</p> : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span className="font-semibold text-gray-700">{s.rating}</span> ({s.reviews ?? 0})</span>
          {s.duration ? <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.duration}</span> : null}
          {locationText ? <span className="flex items-center gap-1" style={{ color: TEAL }}><MapPin className="h-3.5 w-3.5" /> {locationText}</span> : null}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-gray-900">{formatInr(s.price)}</span>
            {s.originalPrice && s.originalPrice > s.price ? (
              <span className="text-sm text-gray-400 line-through">{formatInr(s.originalPrice)}</span>
            ) : null}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filters drawer                                                     */
/* ------------------------------------------------------------------ */

function FiltersDrawer({ open, onClose, ratingFilter, setRatingFilter, offersOnly, setOffersOnly, onClear }: {
  open: boolean; onClose: () => void; ratingFilter: number | null; setRatingFilter: (v: number | null) => void;
  offersOnly: boolean; setOffersOnly: (v: boolean) => void; onClear: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[300px] flex-col bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Filters</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="mb-5 rounded-xl border border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Rating</p>
          <div className="space-y-2.5">
            {[4.5, 4.0, 3.5].map((r) => {
              const active = ratingFilter === r;
              return (
                <label key={r} className="flex cursor-pointer items-center gap-3" onClick={() => setRatingFilter(active ? null : r)}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border-2" style={active ? { borderColor: "#f59e0b", background: "#f59e0b" } : { borderColor: "#d1d5db" }}>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    {Array.from({ length: Math.floor(r) }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)} {r}+
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Offers</p>
          <label className="flex cursor-pointer items-center gap-3" onClick={() => setOffersOnly(!offersOnly)}>
            <span className="flex h-4 w-4 items-center justify-center rounded border-2" style={offersOnly ? { borderColor: TEAL, background: TEAL } : { borderColor: "#d1d5db" }}>
              {offersOnly && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span className="text-sm font-medium text-gray-700">Show deals only</span>
          </label>
        </div>
        <div className="mt-auto flex gap-3 pt-5">
          <button onClick={onClear} className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">Clear</button>
          <button onClick={onClose} className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white" style={{ background: TEAL }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

interface ServiceListPageProps {
  onSelectSeller: (seller: Seller) => void | Promise<void>;
  busyServiceId?: string | null;
}

function mapService(s: ServiceItem): Seller {
  const meta = (s.metadata ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const price = num((s as { basePrice?: unknown }).basePrice) ?? num(s.price) ?? num(meta.price) ?? 0;
  const originalPrice = num(meta.mrp) ?? num(meta.originalPrice) ?? num(meta.compareAtPrice);
  let offerPercent = num(meta.discountPercent) ?? num(meta.offerPercent);
  if (!offerPercent && originalPrice && originalPrice > price && price > 0) {
    offerPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  const provider = (typeof meta.vendorName === "string" && meta.vendorName)
    || (typeof (s as { vendorBusinessName?: string }).vendorBusinessName === "string" ? (s as { vendorBusinessName?: string }).vendorBusinessName : "")
    || "";
  const available = (s as { availability?: boolean }).availability !== false && (s as { isAvailable?: boolean }).isAvailable !== false;
  const isNew = Boolean((s as { trending?: boolean }).trending) || meta.new === true;
  return {
    id: typeof s.id === "number" ? s.id : String(s.id),
    title: s.name,
    image: pickServiceImage(s as unknown as Parameters<typeof pickServiceImage>[0]) ?? "",
    provider,
    description: s.description ?? "",
    rating: 0,
    reviews: 0,
    price,
    originalPrice,
    offerPercent,
    duration: String(typeof meta.duration === "string" ? meta.duration : (s.duration ?? "")),
    distance: "",
    city: String(typeof meta.city === "string" ? meta.city : (typeof meta.area === "string" ? meta.area : "")),
    category: "",
    available,
    isNew,
    badge: null,
    hasOffer: Boolean(offerPercent),
    vendorId: String((s as { vendorId?: string }).vendorId ?? (typeof meta.vendorId === "string" ? meta.vendorId : "")),
  };
}

export default function ServiceListPage({ onSelectSeller, busyServiceId }: ServiceListPageProps) {
  const searchParams = useSearchParams();
  const requestedCategory = useMemo(() => searchParams.get("category")?.trim() ?? "", [searchParams]);

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [sortBy, setSortBy] = useState("nearest");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [offersOnly, setOffersOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [wishIds, setWishIds] = useState<Set<string>>(new Set());
  const subScroller = useRef<HTMLDivElement>(null);

  useEffect(() => { setWishIds(new Set(getServiceWishlist().map((r) => String(r.id)))); }, []);

  useEffect(() => {
    catalogApi.getCategories({ limit: 200, kind: "service" })
      .then((res) => setRootCategories(unwrapList<Category>(res).filter((c) => !c.parentId)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!requestedCategory || rootCategories.length === 0) return;
    const requested = normalizeCategoryToken(requestedCategory);
    const match = rootCategories.find((c) => {
      const name = normalizeCategoryToken(c.name);
      return name === requested || name.includes(requested) || requested.includes(name);
    });
    if (!match || match.id === parentCategoryId) return;
    setParentCategoryId(match.id);
    setSubcategoryId("");
  }, [parentCategoryId, requestedCategory, rootCategories]);

  useEffect(() => {
    if (!parentCategoryId) { setSubcategories([]); setSubcategoryId(""); return; }
    catalogApi.getCategoryChildren(parentCategoryId, { kind: "service" })
      .then((rows) => setSubcategories(unwrapList<Category>(rows)))
      .catch(() => setSubcategories([]));
  }, [parentCategoryId]);

  useEffect(() => {
    setLoading(true);
    const params: { limit: number; offset: number; categoryId?: string; subcategoryId?: string } = { limit: 200, offset: 0 };
    if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
    else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();
    catalogApi.getServices(params).then((res) => {
      const rows = res.data ?? [];
      setTotal(typeof res.total === "number" ? res.total : rows.length);
      setSellers(rows.map(mapService));
    }).catch(() => { setSellers([]); setTotal(0); }).finally(() => setLoading(false));
  }, [parentCategoryId, subcategoryId]);

  const parentCat = rootCategories.find((c) => c.id === parentCategoryId);
  const subCat = subcategories.find((c) => c.id === subcategoryId);
  const title = subCat?.name || parentCat?.name || "All Services";

  const filtered = useMemo(() => {
    let d = [...sellers];
    if (ratingFilter) d = d.filter((s) => s.rating >= ratingFilter);
    if (offersOnly) d = d.filter((s) => s.hasOffer);
    if (sortBy === "low") d.sort((a, b) => a.price - b.price);
    else if (sortBy === "high") d.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") d.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return d;
  }, [sellers, ratingFilter, offersOnly, sortBy]);

  const toggleFav = (s: Seller) => {
    const key = String(s.id);
    const exists = wishIds.has(key);
    const rows = exists
      ? removeServiceWishlist(key)
      : addServiceWishlist({ id: key, title: s.title, image: s.image, provider: s.provider, price: s.price, duration: s.duration, vendorId: s.vendorId });
    setWishIds(new Set(rows.map((r) => String(r.id))));
  };

  const useGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGpsOn(true); return; }
    navigator.geolocation.getCurrentPosition(() => setGpsOn(true), () => setGpsOn(false));
  };

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              <Wrench className="h-6 w-6" style={{ color: TEAL }} /> {title}
            </h1>
            <p className="mt-1 text-sm text-gray-400">Showing services near your selected location</p>
          </div>
          <span className="shrink-0 pt-1 text-sm text-gray-500">{total} services</span>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setFiltersOpen(true)} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300">
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {(offersOnly || ratingFilter) && <span className="ml-0.5 h-2 w-2 rounded-full" style={{ background: TEAL }} />}
          </button>
          <div className="relative">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none rounded-full border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-gray-700 shadow-sm outline-none hover:border-gray-300">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <button type="button" onClick={useGps} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition ${gpsOn ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`} style={gpsOn ? { background: TEAL } : undefined}>
            <Navigation className="h-4 w-4" /> Use GPS
          </button>
        </div>

        {/* Category pills */}
        <div className="mb-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryPill label="All" image={null} isAll active={!parentCategoryId} onClick={() => { setParentCategoryId(""); setSubcategoryId(""); }} />
          {rootCategories.map((c) => (
            <CategoryPill key={c.id} label={c.name} image={pickCategoryImage(c)} active={parentCategoryId === c.id} onClick={() => { setParentCategoryId(c.id); setSubcategoryId(""); }} />
          ))}
        </div>

        {/* Subcategories */}
        {parentCategoryId && subcategories.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Browse {parentCat?.name} services</h2>
              {subcategoryId ? (
                <button type="button" onClick={() => setSubcategoryId("")} className="text-sm font-medium" style={{ color: TEAL }}>Clear</button>
              ) : null}
            </div>
            <div ref={subScroller} className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {subcategories.map((c) => (
                <SubCircle key={c.id} label={c.name} image={pickCategoryImage(c)} active={subcategoryId === c.id} onClick={() => setSubcategoryId(c.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-24 text-center text-gray-400 shadow-sm">No services found. Try another category or filter.</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <ServiceCard
                key={String(s.id)}
                s={s}
                fav={wishIds.has(String(s.id))}
                onToggleFav={toggleFav}
                busy={busyServiceId != null && String(busyServiceId) === String(s.id)}
                onClick={() => void onSelectSeller({ ...s, category: subCat?.name || parentCat?.name || "" })}
              />
            ))}
          </div>
        )}
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        ratingFilter={ratingFilter}
        setRatingFilter={setRatingFilter}
        offersOnly={offersOnly}
        setOffersOnly={setOffersOnly}
        onClear={() => { setRatingFilter(null); setOffersOnly(false); }}
      />
    </div>
  );
}
