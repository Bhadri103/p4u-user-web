"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Star, ChevronRight, X, SlidersHorizontal,
  LayoutGrid, List as ListIcon, ShoppingCart, Zap, Heart,
  Package, Images, Loader2, Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { catalogApi, type Category } from "@/lib/api/catalog";
import { resolveCatalogUnitPrice } from "@/lib/catalog/resolvePrice";
import { pickCategoryImage, resolveMediaUrl } from "@/lib/media";
import { useCart } from "@/providers/CartContext";
import { profileApi } from "@/lib/api/profile";

const SHOP_CARD_PLACEHOLDER = "https://placehold.co/600x400/f3f4f6/64748b?text=P4U";
const TEAL = "#009999";
const BUY_GRADIENT = "linear-gradient(90deg,#0AA79E 0%,#12b3a6 45%,#F5A623 100%)";

type ShopItem = {
  id: string | number;
  title: string;
  image: string;
  price: number;
  vendor: string;
  vendorId: string;
  rating: number;
  reviews: number;
  imageCount: number;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "low", label: "Price: Low to High" },
  { value: "high", label: "Price: High to Low" },
  { value: "popularity", label: "Popularity" },
] as const;

function formatInr(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/*  Category / subcategory circle rail                                 */
/* ------------------------------------------------------------------ */

function CircleThumb({
  label, image, active, onClick, isAll = false, size = 64,
}: {
  label: string; image: string | null; active: boolean; onClick: () => void; isAll?: boolean; size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="group flex shrink-0 flex-col items-center gap-1.5 bg-transparent p-0 text-center outline-none"
      style={{ width: size + 14 }}
    >
      <span
        className={`flex items-center justify-center overflow-hidden rounded-full border-2 bg-white transition-all ${
          active
            ? "border-[#009999] shadow-[0_6px_16px_rgba(0,153,153,0.18)]"
            : "border-slate-200 group-hover:border-[#7fd0ce]"
        }`}
        style={{ height: size, width: size }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${isAll ? "bg-[#f3efe7] text-[#b3794a]" : "bg-slate-100 text-slate-400"}`}>
            <Package className="h-6 w-6" />
          </span>
        )}
      </span>
      <span
        className={`block w-full truncate text-[11px] leading-tight ${
          active ? "font-semibold text-[#009999]" : "font-medium text-slate-600"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function CircleRail({
  categories, selectedId, onSelect, showAll = true, allLabel = "All", size = 64,
}: {
  categories: Category[]; selectedId: string; onSelect: (id: string) => void;
  showAll?: boolean; allLabel?: string; size?: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <div className="relative">
      <div ref={scroller} className="shop-category-rail flex gap-4 overflow-x-auto pb-1 pr-12">
        {showAll && (
          <CircleThumb label={allLabel} image={null} active={!selectedId} isAll size={size} onClick={() => onSelect("")} />
        )}
        {categories.map((c) => (
          <CircleThumb
            key={c.id}
            label={c.name}
            image={pickCategoryImage(c)}
            active={selectedId === c.id}
            size={size}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-[calc(50%-14px)] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md"
        aria-label="Scroll categories"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product card                                                       */
/* ------------------------------------------------------------------ */

function ProductCard({
  item, wished, onOpen, onCart, onBuy, onWish, view,
}: {
  item: ShopItem; wished: boolean; view: "grid" | "list";
  onOpen: () => void; onCart: () => void; onBuy: () => void; onWish: () => void;
}) {
  const src = item.image && item.image.trim() ? item.image : SHOP_CARD_PLACEHOLDER;

  const ImageBox = (
    <div className={`relative overflow-hidden bg-gray-100 ${view === "list" ? "h-full w-full" : "aspect-[4/3]"}`}>
      <Image
        src={src}
        alt={item.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onWish(); }}
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
        aria-label="Wishlist"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
      </button>
      {item.imageCount > 1 && (
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Images className="h-3 w-3" /> {item.imageCount}
        </span>
      )}
    </div>
  );

  const Details = (
    <div className="flex flex-1 flex-col p-3.5">
      <p className="truncate text-[11px] font-medium" style={{ color: TEAL }}>{item.vendor}</p>
      <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900">{item.title}</h3>
      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="font-semibold text-gray-700">{item.rating}</span>
        <span>({item.reviews})</span>
      </div>
      <p className="mt-1.5 text-[17px] font-bold text-gray-900">{formatInr(item.price)}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCart(); }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-semibold transition hover:bg-[#009999]/5"
          style={{ borderColor: TEAL, color: TEAL }}
        >
          <ShoppingCart className="h-4 w-4" /> Cart
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBuy(); }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{ background: BUY_GRADIENT }}
        >
          <Zap className="h-4 w-4 fill-white" /> Buy
        </button>
      </div>
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
      >
        <div className="relative h-auto w-40 shrink-0 sm:w-52">{ImageBox}</div>
        {Details}
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {ImageBox}
      {Details}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filters drawer                                                     */
/* ------------------------------------------------------------------ */

function FiltersDrawer({
  open, onClose, offersOnly, setOffersOnly, ratingFilter, setRatingFilter, onClear,
}: {
  open: boolean; onClose: () => void; offersOnly: boolean; setOffersOnly: (v: boolean) => void;
  ratingFilter: number | null; setRatingFilter: (v: number | null) => void; onClear: () => void;
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
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Tag className="h-3.5 w-3.5 text-amber-400" /> Offers
          </p>
          <label className="flex cursor-pointer items-center gap-3" onClick={() => setOffersOnly(!offersOnly)}>
            <span className="flex h-4 w-4 items-center justify-center rounded border-2"
              style={offersOnly ? { borderColor: "#f59e0b", background: "#f59e0b" } : { borderColor: "#d1d5db" }}>
              {offersOnly && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </span>
            <span className="text-sm font-medium text-gray-700">Show deals only</span>
          </label>
        </div>

        <div className="rounded-xl border border-gray-100 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rating
          </p>
          <div className="space-y-2.5">
            {[4.5, 4.0, 3.5].map((r) => {
              const active = ratingFilter === r;
              return (
                <label key={r} className="flex cursor-pointer items-center gap-3" onClick={() => setRatingFilter(active ? null : r)}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border-2"
                    style={active ? { borderColor: "#f59e0b", background: "#f59e0b" } : { borderColor: "#d1d5db" }}>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    {Array.from({ length: Math.floor(r) }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                    <span>{r}+</span>
                  </span>
                </label>
              );
            })}
          </div>
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
/*  Shop page                                                          */
/* ------------------------------------------------------------------ */

export default function ShopPage(_props: { onVendorSelect?: (vendorId: string) => void }) {
  const router = useRouter();
  const { addToCart, clearCart } = useCart();

  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<string>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [wishIds, setWishIds] = useState<Set<string>>(new Set());

  // Root categories
  useEffect(() => {
    catalogApi.getCategories({ limit: 200, kind: "product" }).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setRootCategories(list.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  // Wishlist ids (best-effort; only when logged in)
  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("p4u_token")) return;
    profileApi.getWishlist().then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      setWishIds(new Set(list.map((r) => String((r as { productId?: string | number }).productId ?? r.id))));
    }).catch(() => {});
  }, []);

  // Subcategories for selected parent
  useEffect(() => {
    if (!parentCategoryId) { setSubcategories([]); setSubcategoryId(""); return; }
    catalogApi.getCategoryChildren(parentCategoryId, { kind: "product" }).then((rows) => {
      const list = Array.isArray(rows) ? rows : ((rows as { data?: Category[] })?.data ?? []);
      setSubcategories(list);
    }).catch(() => setSubcategories([]));
  }, [parentCategoryId]);

  // Products
  useEffect(() => {
    setLoading(true);
    const params: { limit: number; offset: number; categoryId?: string; subcategoryId?: string } = { limit: 120, offset: 0 };
    if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
    else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();

    catalogApi.browseProducts(params).then((res) => {
      const rows = res.data ?? [];
      setTotal(typeof res.total === "number" ? res.total : rows.length);
      setItems(rows.map((p): ShopItem => {
        const unit = resolveCatalogUnitPrice(p as unknown as Record<string, unknown>);
        const rawThumb =
          (typeof p.thumbnailUrl === "string" && p.thumbnailUrl) ||
          (p.metadata && typeof (p.metadata as { imageUrl?: string }).imageUrl === "string" ? (p.metadata as { imageUrl?: string }).imageUrl : "") || "";
        const thumb = resolveMediaUrl(rawThumb) || rawThumb;
        const banners = Array.isArray(p.bannerUrls) ? p.bannerUrls.filter(Boolean) : [];
        const imageCount = (thumb ? 1 : 0) + banners.length;
        return {
          id: p.id,
          title: p.name || "Product",
          image: thumb || SHOP_CARD_PLACEHOLDER,
          price: unit,
          vendor: (p as { vendorBusinessName?: string | null }).vendorBusinessName?.trim() || "Vendor",
          vendorId: String(p.vendorId ?? ""),
          rating: 0,
          reviews: 0,
          imageCount: imageCount || 1,
        };
      }));
    }).catch(() => { setItems([]); setTotal(0); }).finally(() => setLoading(false));
  }, [parentCategoryId, subcategoryId]);

  const filtered = useMemo(() => {
    let data = [...items];
    if (ratingFilter) data = data.filter((s) => s.rating >= ratingFilter);
    if (sortBy === "low") data.sort((a, b) => a.price - b.price);
    else if (sortBy === "high") data.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") data.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return data;
  }, [items, ratingFilter, sortBy]);

  const parentCat = rootCategories.find((c) => c.id === parentCategoryId);
  const subCat = subcategories.find((c) => c.id === subcategoryId);
  const title = subCat?.name || parentCat?.name || "All Products";
  const showSubRail = Boolean(parentCategoryId) && subcategories.length > 0;
  const showShopHeading = showSubRail && !subcategoryId;
  const showAllProductsHeading = Boolean(parentCategoryId) && !subcategoryId;

  function toggleWish(id: string) {
    if (typeof window !== "undefined" && !localStorage.getItem("p4u_token")) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    const has = wishIds.has(id);
    setWishIds((prev) => { const next = new Set(prev); if (has) next.delete(id); else next.add(id); return next; });
    (has ? profileApi.removeFromWishlist(id) : profileApi.addToWishlist(id)).catch(() => {
      setWishIds((prev) => { const next = new Set(prev); if (has) next.add(id); else next.delete(id); return next; });
    });
  }

  function cartPayload(item: ShopItem) {
    return {
      id: item.id, productId: item.id, variationId: null,
      name: item.title, price: item.price, originalPrice: item.price,
      image: item.image, imageUrl: item.image,
      vendor: item.vendor, vendorId: item.vendorId,
    };
  }

  function handleCart(item: ShopItem) { addToCart(cartPayload(item)); }

  function handleBuy(item: ShopItem) {
    if (typeof window !== "undefined" && !localStorage.getItem("p4u_token")) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    clearCart();
    addToCart(cartPayload(item));
    try { sessionStorage.setItem("openCart", "1"); } catch { /* ignore */ }
    router.push("/cart");
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] font-sans">
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        {/* Header row */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-gray-400">Showing results near your selected location</p>
          </div>
          <span className="shrink-0 pt-1 text-sm text-gray-500">{total} products</span>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {(offersOnly || ratingFilter) && <span className="ml-0.5 h-2 w-2 rounded-full" style={{ background: TEAL }} />}
            </button>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-full border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-medium text-gray-700 shadow-sm outline-none hover:border-gray-300"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "grid" ? "bg-[#009999]/10 text-[#009999]" : "text-gray-400"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "list" ? "bg-[#009999]/10 text-[#009999]" : "text-gray-400"}`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category circle rail */}
        <CircleRail
          categories={rootCategories}
          selectedId={parentCategoryId}
          onSelect={(id) => { setParentCategoryId(id); setSubcategoryId(""); }}
        />

        {/* Subcategories */}
        {showSubRail && (
          <div className="mt-6">
            {showShopHeading && (
              <h2 className="mb-4 text-xl font-bold text-gray-900">Shop {parentCat?.name}</h2>
            )}
            <CircleRail
              categories={subcategories}
              selectedId={subcategoryId}
              showAll={false}
              size={58}
              onSelect={(id) => setSubcategoryId(id)}
            />
          </div>
        )}

        {/* Grid heading */}
        {showAllProductsHeading && (
          <h2 className="mb-4 mt-8 text-xl font-bold text-gray-900">All products</h2>
        )}

        {/* Products */}
        <div className={showAllProductsHeading ? "" : "mt-8"}>
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white py-24 text-center text-gray-400 shadow-sm">
              No products found. Pick a category or adjust filters.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  view="grid"
                  wished={wishIds.has(String(item.id))}
                  onOpen={() => item.vendorId && router.push(`/shop/${item.vendorId}/${item.id}`)}
                  onCart={() => handleCart(item)}
                  onBuy={() => handleBuy(item)}
                  onWish={() => toggleWish(String(item.id))}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  view="list"
                  wished={wishIds.has(String(item.id))}
                  onOpen={() => item.vendorId && router.push(`/shop/${item.vendorId}/${item.id}`)}
                  onCart={() => handleCart(item)}
                  onBuy={() => handleBuy(item)}
                  onWish={() => toggleWish(String(item.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        offersOnly={offersOnly}
        setOffersOnly={setOffersOnly}
        ratingFilter={ratingFilter}
        setRatingFilter={setRatingFilter}
        onClear={() => { setOffersOnly(false); setRatingFilter(null); }}
      />
    </div>
  );
}
