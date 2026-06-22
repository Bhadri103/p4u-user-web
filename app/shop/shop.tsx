"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Star, Clock, ChevronLeft, ChevronRight, Search, X,
  ShoppingBag, Filter, Tag,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  TEAL_GRADIENT,
  ITEMS_PER_PAGE,
} from "./constants";
import { catalogApi, type Category } from "@/lib/api/catalog";
import { Loader2 } from "lucide-react";
import { resolveCatalogUnitPrice } from "@/lib/catalog/resolvePrice";
import { resolveMediaUrl } from "@/lib/media";

const SHOP_CARD_PLACEHOLDER =
  "https://placehold.co/600x400/f3f4f6/64748b?text=Shop";
 

type ShopItem = {
  id: string | number
  title: string
  image: string
  distance: string
  rating: number
  price: number
  duration: string
  provider: string
  number: string
  pts: number
  vendorId: string
  category: string
  badge?: {
    label: string
    bg: string
  } | null
}

function CardImage({ item }: { item: ShopItem }) {
  const src =
    typeof item.image === "string" && item.image.trim() !== ""
      ? item.image
      : SHOP_CARD_PLACEHOLDER;
  return (
    <div className="relative h-[150px] overflow-hidden bg-gray-100 group">
      <Image
        src={src}
        alt={item.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {item.badge && (
        <div
          className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-lg"
          style={{ background: item.badge.bg }}
        >
          {item.badge.label}
        </div>
      )}
    </div>
  );
}
 

function ProductBrowseCard({ item, onVendorSelect }: { item: ShopItem; onVendorSelect?: (vendorId: string) => void }) {
  const router = useRouter();
  const vid = String(item.vendorId || "").trim();
  const canOpen = Boolean(vid && item.id);
  const pid = String(item.id ?? "").trim();
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col border border-gray-100 ${
        canOpen ? "hover:shadow-xl hover:-translate-y-0.5 cursor-pointer" : "opacity-90 cursor-not-allowed"
      }`}
      onClick={() => {
        if (!canOpen) return;
        if (onVendorSelect) onVendorSelect(vid);
        else {
          router.push(`/shop/${vid}/${item.id}`);
        }
      }}
      onMouseEnter={() => {
        if (!canOpen) return;
        if (onVendorSelect) {
          router.prefetch(`/shop/${vid}`);
          void Promise.all([
            catalogApi.prefetchVendor(vid),
            catalogApi.prefetchVendorProducts(vid, { limit: 50, offset: 0 }),
          ]);
          return;
        }
        if (pid) {
          router.prefetch(`/shop/${vid}/${pid}`);
          void catalogApi.prefetchProduct(pid);
        }
      }}
    >
      <CardImage item={item} />
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-tight truncate">{item.title}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{item.number}</p>
          </div>
          <div className="flex items-center gap-0.5 ml-2 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded-full">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-amber-600">{item.rating}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-2.5 truncate">{item.provider}</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-emerald-600" />
            <span className="text-xs font-semibold text-gray-700">₹{item.price}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-amber-600">{item.pts} pts</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-500 shrink-0" />
          <span className="text-xs text-gray-500">{item.duration}</span>
        </div>
      </div>
    </div>
  );
}
 

type PaginationProps = {
  current: number
  total: number
  onChange: (page: number) => void
}

function Pagination({ current, total, onChange }: PaginationProps) {


  const getPages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 mb-4">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 disabled:opacity-30 hover:border-emerald-400 transition"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      {getPages().map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="w-8 text-center text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => typeof p === "number" && onChange(p)}
            className="w-9 h-9 rounded-xl text-xs font-semibold transition-all border"
            style={
              p === current
                ? { background: TEAL_GRADIENT, color: "white", borderColor: "transparent" }
                : { background: "white", color: "#374151", borderColor: "#e5e7eb" }
            }
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 disabled:opacity-30 hover:border-emerald-400 transition"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}  
type SidebarContentProps = {
  offersOnly: boolean
  setOffersOnly: (v: boolean) => void
  ratingFilter: number | null
  setRatingFilter: (v: number | null) => void
  setPage: (p: number) => void
}

function SidebarContent({
  offersOnly,
  setOffersOnly,
  ratingFilter,
  setRatingFilter,
  setPage,
}: SidebarContentProps) {
  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl px-4 py-3 bg-white shadow-sm border border-gray-100 text-xs text-gray-500">
        <p className="font-semibold text-gray-600 mb-1">Category</p>
        <p className="leading-relaxed">Use the category and subcategory menus above the product grid. Shop lists only products (not services).</p>
      </div>
      <div className="rounded-2xl px-4 py-3 bg-white shadow-sm border border-gray-100">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-3 flex items-center gap-2 text-gray-500">
          <Tag className="w-3.5 h-3.5 text-amber-400" /> Offers
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => { setOffersOnly(!offersOnly); setPage(1); }}
            className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0"
            style={
              offersOnly
                ? { borderColor: "#f59e0b", backgroundColor: "#f59e0b" }
                : { borderColor: "#d1d5db", backgroundColor: "#fafafa" }
            }
          >
            {offersOnly && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: offersOnly ? "#b45309" : "#4b5563" }}>
            Show deals only
          </span>
          {offersOnly && (
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              ON
            </span>
          )}
        </label>
      </div> 
      <div className="rounded-2xl px-4 py-3 bg-white shadow-sm border border-gray-100">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-3 flex items-center gap-2 text-gray-500">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rating
        </p>
        <div className="space-y-2.5">
          {[4.5, 4.0, 3.5].map((r) => {
            const active = ratingFilter === r;
            return (
              <label key={r} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => { setRatingFilter(active ? null : r); setPage(1); }}
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                  style={
                    active
                      ? { borderColor: "#f59e0b", backgroundColor: "#f59e0b" }
                      : { borderColor: "#d1d5db", backgroundColor: "#fafafa" }
                  }
                >
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: active ? "#b45309" : "#4b5563" }}
                >
                  {Array.from({ length: Math.floor(r) }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span>{r}+</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
 
export default function ShopPage({ onVendorSelect }: { onVendorSelect?: (vendorId: string) => void }) {
  const [sellers, setSellers] = useState<ShopItem[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [loadingSellers, setLoadingSellers] = useState(true);

  const [sortBy, setSortBy] = useState("popularity");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [offersOnly, setOffersOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    catalogApi.getCategories({ limit: 200, kind: "product" }).then((res) => {
      let list: Category[] = [];
      if (Array.isArray(res)) list = res;
      else if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: Category[] }).data)) {
        list = (res as { data: Category[] }).data;
      }
      setRootCategories(list.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!parentCategoryId) {
      setSubcategories([]);
      setSubcategoryId("");
      return;
    }
    catalogApi.getCategoryChildren(parentCategoryId, { kind: "product" }).then((rows) => {
      let list: Category[] = [];
      if (Array.isArray(rows)) list = rows;
      else if (rows && typeof rows === "object" && "data" in rows && Array.isArray((rows as { data: Category[] }).data)) {
        list = (rows as { data: Category[] }).data;
      }
      setSubcategories(list);
      setSubcategoryId("");
    }).catch(() => {
      setSubcategories([]);
    });
  }, [parentCategoryId]);

  useEffect(() => {
    setLoadingSellers(true);
    const params: {
      limit: number;
      offset: number;
      categoryId?: string;
      subcategoryId?: string;
    } = { limit: 100, offset: 0 };
    if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
    else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();

    catalogApi.browseProducts(params).then((res) => {
      const rows = res.data ?? [];
      setSellers(
        rows.map((p): ShopItem => {
          const unit = resolveCatalogUnitPrice(p as unknown as Record<string, unknown>);
          const rawThumb =
            (typeof p.thumbnailUrl === "string" && p.thumbnailUrl) ||
            (p.metadata && typeof (p.metadata as { imageUrl?: string }).imageUrl === "string"
              ? (p.metadata as { imageUrl?: string }).imageUrl
              : "") ||
            "";
          const thumb = resolveMediaUrl(rawThumb) || rawThumb;
          return {
            id: p.id,
            title: p.name || "Product",
            number: String(p.id).slice(0, 8),
            provider: (p as { vendorBusinessName?: string | null }).vendorBusinessName?.trim() || "Vendor",
            category: "",
            vendorId: String(p.vendorId ?? ""),
            rating: 0,
            duration: "Product",
            price: unit,
            pts: 0,
            distance: "",
            badge: null,
            image: thumb || SHOP_CARD_PLACEHOLDER,
          };
        }),
      );
    }).catch((err: unknown) => {
      console.error("Failed to load shop products:", err);
      setSellers([]);
    }).finally(() => setLoadingSellers(false));
  }, [parentCategoryId, subcategoryId]);

  const filtered = useMemo(() => {
    let data = [...sellers];
    if (search) data = data.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
    if (ratingFilter) data = data.filter((s) => s.rating >= ratingFilter);
    if (offersOnly) data = data.filter((s) => s.badge !== null);
    if (sortBy === "low") data.sort((a, b) => a.price - b.price);
    else if (sortBy === "high") data.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") data.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    else data.sort((a, b) => b.rating - a.rating);
    return data;
  }, [sellers, search, ratingFilter, offersOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const activeFilters = [
    sortBy !== "popularity" ? sortBy : null,
    ratingFilter ? `⭐ ${ratingFilter}+` : null,
    offersOnly ? "Offers" : null,
  ].filter(Boolean);

  const removeFilter = (f: string) => {
    if (["low", "high", "newest"].includes(f)) setSortBy("popularity");
    else if (f.startsWith("⭐")) setRatingFilter(null);
    else if (f === "Offers") setOffersOnly(false);
    setPage(1);
  };

  const sidebarProps = { offersOnly, setOffersOnly, ratingFilter, setRatingFilter, setPage };

  return (
    <div className="min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-5 flex gap-5 items-start"> 
        <aside className="hidden lg:block w-52 shrink-0 sticky top-4">
          <SidebarContent {...sidebarProps} />
        </aside> 
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-white/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-800 text-sm">Filters</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <SidebarContent {...sidebarProps} />
            </div>
          </div>
        )} 
        <div className="flex-1 min-w-0"> 
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="space-y-2 min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-900">Shop — Products</h1>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={parentCategoryId}
                  onChange={(e) => {
                    setParentCategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 max-w-[180px]"
                >
                  <option value="">All categories</option>
                  {rootCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setPage(1);
                  }}
                  disabled={!parentCategoryId || subcategories.length === 0}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 max-w-[180px] disabled:opacity-50"
                >
                  <option value="">
                    {parentCategoryId ? (subcategories.length ? "All subcategories" : "No subcategories") : "Subcategory"}
                  </option>
                  {subcategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} results
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-sm"
            >
              <Filter className="w-4 h-4" /> Filters
              {activeFilters.length > 0 && (
                <span
                  className="ml-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: TEAL_GRADIENT }}
                >
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div> 
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {activeFilters.map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                  style={{ background: TEAL_GRADIENT }}
                >
                  {f}
                  <button onClick={() => removeFilter(f as string)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  setSortBy("popularity");
                  setRatingFilter(null); setOffersOnly(false); setPage(1);
                }}
                className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600"
              >
                Clear all
              </button>
            </div>
          )} 
          <div className="bg-white rounded-2xl px-4 py-3 mb-5 shadow-sm border border-gray-100"> 
            <div
              className="flex items-center gap-2 mb-3"
              style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-shrink-0">Sort By</span>
              {[
                { label: "Price", icon: <ArrowUp className="w-3 h-3" />, val: "low" },
                { label: "Price", icon: <ArrowDown className="w-3 h-3" />, val: "high" },
                { label: "Newest", val: "newest" },
                { label: "Popularity", val: "popularity" },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => { setSortBy(s.val); setPage(1); }}
                  className="text-xs px-3.5 py-1.5 rounded-full font-medium border transition-all flex-shrink-0 flex items-center gap-1"
                  style={
                    sortBy === s.val
                      ? { background: TEAL_GRADIENT, color: "white", borderColor: "transparent" }
                      : { background: "#f9fafb", color: "#374151", borderColor: "#e5e7eb" }
                  }
                >
                  {s.label}
                  {s.icon && s.icon}
                </button>
              ))}
            </div> 
            <div className="flex justify-end">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden w-48 sm:w-56">
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search Seller"
                  className="text-xs px-3 py-2 outline-none flex-1 bg-transparent min-w-0"
                />
                <button className="px-3 py-2 text-white flex-shrink-0" style={{ background: TEAL_GRADIENT }}>
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div> 
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full inline-block" style={{ background: TEAL_GRADIENT }} />
            Products
          </h2>
 
          {loadingSellers ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="bg-white rounded-2xl py-24 text-center text-gray-400 shadow-sm">
              No products found. Pick a category or adjust filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {paginated.map((service) => (
                <ProductBrowseCard key={service.id} item={service} onVendorSelect={onVendorSelect} />
              ))}
            </div>
          )} 
          {totalPages > 1 && (
            <Pagination
              current={page}
              total={totalPages}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}