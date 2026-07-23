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
import { pickCategoryImage, pickProductImage, resolveMediaUrl, alternateUploadUrl } from "@/lib/media";
import { useCart } from "@/providers/CartContext";
import { profileApi } from "@/lib/api/profile";

const SHOP_CARD_PLACEHOLDER = "https://placehold.co/600x400/f3f4f6/64748b?text=P4U";
const TEAL = "#009999";
const BUY_GRADIENT = "linear-gradient(135deg,#009E97 0%,#007A75 100%)";
const PAGE_SIZE = 24;

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
      aria-pressed={active}
      className="group relative flex shrink-0 flex-col items-center gap-2 bg-transparent px-1 pb-3 pt-1 text-center outline-none"
      style={{ width: size + 28 }}
    >
      <span
        className={`flex items-center justify-center overflow-hidden rounded-[18px] border bg-white transition-all ${
          active
            ? "border-[#009E97] shadow-[0_7px_18px_rgba(0,158,151,0.18)]"
            : "border-white/80 shadow-sm group-hover:border-[#8bd7d3]"
        }`}
        style={{ height: size, width: size }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${isAll ? "bg-white text-[#007A75]" : "bg-[#edf8f7] text-[#5f8583]"}`}>
            <Package className="h-6 w-6" />
          </span>
        )}
      </span>
      <span className={`block w-full truncate text-[12px] leading-tight ${active ? "font-black text-slate-950" : "font-bold text-slate-700"}`}>
        {label}
      </span>
      <span className={`absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-[#007A75] transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
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
      <div ref={scroller} className="shop-category-rail flex gap-1 overflow-x-auto pb-0 pr-10 sm:gap-3">
        {showAll && (
          <CircleThumb label={allLabel} image={null} active={!selectedId} isAll size={size} onClick={() => onSelect("")} />
        )}
        {categories.map((category) => (
          <CircleThumb
            key={category.id}
            label={category.name}
            image={pickCategoryImage(category)}
            active={selectedId === category.id}
            size={size}
            onClick={() => onSelect(category.id)}
          />
        ))}
      </div>
      {categories.length > 4 && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-[38%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-teal-100 bg-white text-teal-700 shadow-md sm:flex"
          aria-label="Scroll categories"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
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
  const initial = item.image && item.image.trim() ? item.image : SHOP_CARD_PLACEHOLDER;
  const [src, setSrc] = useState(initial);
  const [triedAlt, setTriedAlt] = useState(false);

  useEffect(() => {
    setSrc(initial);
    setTriedAlt(false);
  }, [initial]);

  const ImageBox = (
    <div className={`relative overflow-hidden rounded-[20px] bg-[#edf8f7] ${view === "list" ? "h-full w-full" : "aspect-square"}`}>
      <Image
        src={src}
        alt={item.title}
        fill
        className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        loading="lazy"
        onError={() => {
          if (!triedAlt) {
            const alt = alternateUploadUrl(src);
            if (alt && alt !== src) {
              setTriedAlt(true);
              setSrc(alt);
              return;
            }
          }
          if (src !== SHOP_CARD_PLACEHOLDER) setSrc(SHOP_CARD_PLACEHOLDER);
        }}
      />
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onWish(); }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition hover:scale-105"
        aria-label="Wishlist"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : "text-slate-600"}`} />
      </button>
      {item.imageCount > 1 && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-950/65 px-2 py-1 text-[9px] font-bold text-white">
          <Images className="h-3 w-3" /> {item.imageCount}
        </span>
      )}
    </div>
  );

  const Details = (
    <div className="flex flex-1 flex-col px-1 pb-1 pt-3 sm:px-2">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#007A75]">{item.vendor}</p>
      <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-[14px] font-black leading-[1.25rem] text-slate-950 sm:text-[15px]">{item.title}</h3>
      {item.rating > 0 ? (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-700">{item.rating}</span>
          <span>({item.reviews})</span>
        </div>
      ) : (
        <p className="mt-1 text-[11px] font-medium text-slate-400">Available from this seller</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="inline-flex rounded-lg bg-[#007A75] px-2 py-1 text-[15px] font-black text-white">{formatInr(item.price)}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onCart(); }}
          className="flex min-h-10 items-center justify-center gap-1 rounded-xl border-2 border-[#009E97] bg-white px-2 text-xs font-black text-[#007A75] transition hover:bg-[#e8f7f6] sm:text-sm"
        >
          <ShoppingCart className="h-4 w-4" /> Add
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onBuy(); }}
          className="flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-xs font-black text-white shadow-sm transition hover:opacity-95 sm:text-sm"
          style={{ background: BUY_GRADIENT }}
        >
          <Zap className="h-4 w-4 fill-white" /> Buy now
        </button>
      </div>
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer overflow-hidden rounded-[24px] border border-teal-100 bg-white p-3 shadow-[0_8px_25px_rgba(15,118,110,0.08)] transition hover:border-teal-200 hover:shadow-md"
      >
        <div className="relative min-h-44 w-36 shrink-0 sm:w-48">{ImageBox}</div>
        {Details}
      </div>
    );
  }

  return (
    <article
      onClick={onOpen}
      className="group flex cursor-pointer flex-col rounded-[24px] bg-white p-2 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,118,110,0.12)] sm:p-3"
    >
      {ImageBox}
      {Details}
    </article>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [sortBy, setSortBy] = useState<string>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [wishIds, setWishIds] = useState<Set<string>>(new Set());

  function mapProductRows(rows: Awaited<ReturnType<typeof catalogApi.browseProducts>>["data"]): ShopItem[] {
    return (rows ?? []).map((p): ShopItem => {
      const unit = resolveCatalogUnitPrice(p as unknown as Record<string, unknown>);
      const thumb = pickProductImage(p) || "";
      const banners = Array.isArray(p.bannerUrls) ? p.bannerUrls.filter(Boolean) : [];
      const imageCount = (thumb ? 1 : 0) + banners.filter((b) => resolveMediaUrl(b) !== thumb).length;
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
    });
  }

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

  // Products (first page)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasMore(false);
    const params: { limit: number; offset: number; categoryId?: string; subcategoryId?: string } = {
      limit: PAGE_SIZE,
      offset: 0,
    };
    if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
    else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();

    catalogApi.browseProducts(params).then((res) => {
      if (cancelled) return;
      const rows = res.data ?? [];
      const totalCount = typeof res.total === "number" ? res.total : rows.length;
      setTotal(totalCount);
      setItems(mapProductRows(rows));
      setHasMore(rows.length >= PAGE_SIZE);
    }).catch(() => {
      if (cancelled) return;
      setItems([]);
      setTotal(0);
      setHasMore(false);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [parentCategoryId, subcategoryId]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params: { limit: number; offset: number; categoryId?: string; subcategoryId?: string } = {
        limit: PAGE_SIZE,
        offset: items.length,
      };
      if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
      else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();
      const res = await catalogApi.browseProducts(params);
      const rows = res.data ?? [];
      const totalCount = typeof res.total === "number" ? res.total : total;
      setTotal(totalCount);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => String(p.id)));
        const next = mapProductRows(rows).filter((p) => !seen.has(String(p.id)));
        return [...prev, ...next];
      });
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

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
    <div className="min-h-screen bg-[#f7fbfb] font-sans text-slate-950">
      <section className="overflow-hidden bg-gradient-to-b from-[#ccefed] via-[#e9f8f7] to-[#f7fbfb]">
        <div className="mx-auto max-w-[1400px] px-3 pb-5 pt-4 sm:px-5 md:px-8 md:pb-8 md:pt-6">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#009E97] via-[#008B85] to-[#006C68] px-5 py-6 text-white shadow-[0_18px_45px_rgba(0,122,117,0.22)] sm:px-8 sm:py-8 md:min-h-[210px] md:px-10 md:py-10">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] backdrop-blur">
                <Zap className="h-3.5 w-3.5 fill-white" /> P4U marketplace
              </span>
              <h1 className="mt-4 max-w-xl text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">
                Everything you need, easy to discover
              </h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                Browse {total} products from local vendors with secure P4U checkout.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold sm:text-xs">
                <span className="rounded-full bg-white px-3 py-2 text-[#006C68]">Verified sellers</span>
                <span className="rounded-full bg-white/15 px-3 py-2 text-white ring-1 ring-white/25">Secure checkout</span>
                <span className="rounded-full bg-white/15 px-3 py-2 text-white ring-1 ring-white/25">Easy ordering</span>
              </div>
            </div>
            <div className="absolute -bottom-14 -right-10 h-48 w-48 rounded-full bg-white/10 sm:h-64 sm:w-64" />
            <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 rounded-[30px] border border-white/20 bg-white/15 p-8 backdrop-blur md:block">
              <Package className="h-20 w-20 text-white" strokeWidth={1.4} />
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-white/80 bg-white/90 p-3 shadow-[0_12px_35px_rgba(15,118,110,0.10)] backdrop-blur sm:p-5">
            <div className="mb-2 flex items-center justify-between px-1 sm:mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#007A75]">Browse quickly</p>
                <h2 className="text-lg font-black text-slate-950 sm:text-xl">Shop by category</h2>
              </div>
              <span className="rounded-full bg-[#e1f5f3] px-3 py-1.5 text-[11px] font-black text-[#007A75]">{rootCategories.length} categories</span>
            </div>
            <CircleRail
              categories={rootCategories}
              selectedId={parentCategoryId}
              onSelect={(id) => { setParentCategoryId(id); setSubcategoryId(""); }}
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-3 pb-12 sm:px-5 md:px-8">
        <div className="mb-5 flex gap-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white p-3 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl bg-[#e8f7f6] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#007A75] shadow-sm"><Tag className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black text-slate-950">Coupons & offers</p>
              <p className="text-xs font-medium text-slate-500">Available vendor offers remain visible during checkout</p>
            </div>
          </div>
          <div className="flex min-w-[250px] flex-1 items-center gap-3 rounded-xl bg-[#f0f8f8] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#007A75] shadow-sm"><ShoppingCart className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black text-slate-950">Your shopping cart</p>
              <p className="text-xs font-medium text-slate-500">Add products or use Buy Now whenever you are ready</p>
            </div>
          </div>
        </div>

        {showSubRail && (
          <section className="mb-6 rounded-[24px] bg-white p-4 shadow-[0_8px_24px_rgba(15,118,110,0.08)] sm:p-5">
            {showShopHeading && (
              <h2 className="mb-3 text-lg font-black text-slate-950">Shop {parentCat?.name}</h2>
            )}
            <CircleRail
              categories={subcategories}
              selectedId={subcategoryId}
              showAll={false}
              size={56}
              onSelect={(id) => setSubcategoryId(id)}
            />
          </section>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#007A75]">Curated marketplace</p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {showAllProductsHeading ? "All products" : title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{total} products near your selected location</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-teal-100 bg-white px-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-300"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#007A75]" /> Filters
              {(offersOnly || ratingFilter) && <span className="h-2 w-2 rounded-full bg-[#009E97]" />}
            </button>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-h-10 appearance-none rounded-xl border border-teal-100 bg-white py-2 pl-3.5 pr-9 text-sm font-bold text-slate-700 shadow-sm outline-none transition hover:border-teal-300"
              >
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
            </div>
            <div className="flex min-h-10 items-center gap-1 rounded-xl border border-teal-100 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "grid" ? "bg-[#e1f5f3] text-[#007A75]" : "text-slate-400"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "list" ? "bg-[#e1f5f3] text-[#007A75]" : "text-slate-400"}`}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <section>
          {loading ? (
            <div className="flex justify-center rounded-[28px] bg-white py-24"><Loader2 className="h-8 w-8 animate-spin text-[#009E97]" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[28px] bg-white py-24 text-center text-slate-400 shadow-sm">
              No products found. Pick a category or adjust filters.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          {hasMore && (
            <div className="mt-9 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#009E97] bg-white px-6 text-sm font-black text-[#007A75] transition hover:bg-[#e8f7f6] disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loadingMore ? "Loadingâ€¦" : "Load more products"}
              </button>
            </div>
          )}
        </section>
      </main>

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