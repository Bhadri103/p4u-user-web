"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Star, ChevronRight, X, SlidersHorizontal,
  LayoutGrid, List as ListIcon, Heart,
  Package, Images, Loader2, Tag,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { catalogApi, type Category } from "@/lib/api/catalog";
import { resolveCatalogUnitPrice } from "@/lib/catalog/resolvePrice";
import { pickCategoryImage, pickProductImage, resolveMediaUrl, alternateUploadUrl } from "@/lib/media";
import { useCart } from "@/providers/CartContext";
import { profileApi } from "@/lib/api/profile";
import PurchaseActionButton from "@/components/shop/PurchaseActionButton";

const TEAL = "#89CFF0";
const PAGE_SIZE = 24;
const ALL_CATEGORIES_COUNT_KEY = "__all__";

type ShopItem = {
  id: string | number;
  title: string;
  image: string;
  price: number;
  originalPrice: number;
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
            ? "border-[#89CFF0] shadow-[0_6px_16px_rgba(137,207,240,0.16)]"
            : "border-slate-200 group-hover:border-[#B8E3F7]"
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
          active ? "font-semibold text-[#89CFF0]" : "font-medium text-slate-600"
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
  const initial = item.image?.trim() || "";
  const [src, setSrc] = useState(initial);
  const [triedAlt, setTriedAlt] = useState(false);

  useEffect(() => {
    setSrc(initial);
    setTriedAlt(false);
  }, [initial]);

  const discount = item.originalPrice > item.price
    ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
    : 0;

  const ImageBox = (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#F7FBFF] to-[#EAF4FF]/60 ${view === "list" ? "h-full w-full" : "aspect-[4/3]"}`}>
      {src ? <Image
        src={src}
        alt={item.title}
        fill
        className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.02]"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
          setSrc("");
        }}
      /> : <div className="flex h-full w-full items-center justify-center text-slate-400" role="img" aria-label={`${item.title} image unavailable`}><Package className="h-8 w-8" /></div>}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onWish(); }}
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white"
        aria-label="Wishlist"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
      </button>
      {item.imageCount > 1 && (
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[#89CFF0]/85 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur">
          <Images className="h-3 w-3" /> {item.imageCount}
        </span>
      )}
    </div>
  );

  const Details = (
    <div className="flex flex-1 flex-col px-3 pb-4 pt-2.5">
      {discount >= 25 ? <span className="mb-2 w-fit rounded-full border border-[#D7E7F5] bg-[#EAF4FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#202124]">Planext4u Choice</span> : null}
      <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug text-[#202124]">{item.title}</h3>
      <p className="mt-1 truncate text-xs text-[#5D757A]">by {item.vendor}</p>
      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
        <Star className="h-3.5 w-3.5 fill-[#B8E3F7] text-[#B8E3F7]" />
        <span className="font-semibold text-gray-700">{item.rating}</span>
        <span>({item.reviews})</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <p className="text-[22px] font-semibold leading-none text-[#202124]">{formatInr(item.price)}</p>
        {item.originalPrice > item.price ? <p className="text-xs text-[#5D757A]">M.R.P: <span className="line-through">{formatInr(item.originalPrice)}</span></p> : null}
        {discount > 0 ? <p className="text-xs font-semibold text-[#89CFF0]">({discount}% off)</p> : null}
      </div>
      <p className="mt-2 text-xs text-[#5D757A]">Inclusive of all taxes</p>
      <p className="mt-1 text-xs text-[#5D757A]"><span className="font-semibold text-[#202124]">Quality verified</span> · Delivery shown at checkout</p>
      <div className="mt-auto grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
        <PurchaseActionButton action="cart" compact onClick={onCart} />
        <PurchaseActionButton action="buy" compact onClick={onBuy} />
      </div>
    </div>
  );

  if (view === "list") {
    return (
      <div
        onClick={onOpen}
        className="shop-product-card group relative flex cursor-pointer overflow-hidden rounded-2xl border border-[#D7E7F5] bg-white shadow-[0_10px_30px_rgba(137,207,240,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-[#B8E3F7] hover:shadow-[0_20px_42px_rgba(137,207,240,0.13)]"
      >
        <div className="relative h-auto w-40 shrink-0 sm:w-52">{ImageBox}</div>
        {Details}
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="shop-product-card group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#D7E7F5] bg-white shadow-[0_10px_30px_rgba(137,207,240,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-[#B8E3F7] hover:shadow-[0_20px_42px_rgba(137,207,240,0.13)]"
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
              style={offersOnly ? { borderColor: "#B8E3F7", background: "#B8E3F7" } : { borderColor: "#D7E7F5" }}>
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
                    style={active ? { borderColor: "#B8E3F7", background: "#B8E3F7" } : { borderColor: "#D7E7F5" }}>
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
  const searchParams = useSearchParams();
  const searchQ = (searchParams.get("q") || "").trim();
  const { addToCart, clearCart } = useCart();

  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>({});
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const productScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

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
        image: thumb,
        price: unit,
        originalPrice: Number(
          (p as { mrp?: number | string; compareAtPrice?: number | string }).mrp ??
            (p as { compareAtPrice?: number | string }).compareAtPrice ??
            unit,
        ) || unit,
        vendor: (p as { vendorBusinessName?: string | null }).vendorBusinessName?.trim() || "Vendor",
        vendorId: String(p.vendorId ?? ""),
        rating: Number((p as { rating?: number }).rating ?? 0) || 0,
        reviews: Number((p as { reviewCount?: number; reviews?: number }).reviewCount ?? (p as { reviews?: number }).reviews ?? 0) || 0,
        imageCount,
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

  // Product totals for the category sidebar. Keep the requests bounded so a
  // large category catalog does not flood the API all at once.
  useEffect(() => {
    if (rootCategories.length === 0) return;
    let cancelled = false;
    const categoriesToCount = [
      { id: ALL_CATEGORIES_COUNT_KEY, categoryId: undefined },
      ...rootCategories.map((category) => ({ id: category.id, categoryId: category.id })),
    ];

    const run = async () => {
      const nextCounts: Record<string, number> = {};
      let cursor = 0;
      const worker = async () => {
        while (!cancelled) {
          const entry = categoriesToCount[cursor++];
          if (!entry) return;
          try {
            const result = await catalogApi.browseProducts({
              limit: 1,
              offset: 0,
              categoryId: entry.categoryId,
            });
            nextCounts[entry.id] = typeof result.total === "number"
              ? result.total
              : (result.data ?? []).length;
            if (!cancelled) setCategoryProductCounts({ ...nextCounts });
          } catch {
            nextCounts[entry.id] = 0;
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(6, categoriesToCount.length) }, () => worker()));
      if (!cancelled) setCategoryProductCounts({ ...nextCounts });
    };

    void run();
    return () => { cancelled = true; };
  }, [rootCategories]);

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

  // Products (first page) — browse or catalog search
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setHasMore(false);

    const run = async () => {
      try {
        if (searchQ) {
          const res = await catalogApi.search(searchQ, { limit: PAGE_SIZE, offset: 0 });
          if (cancelled) return;
          const rows = (res.products ?? []) as Awaited<ReturnType<typeof catalogApi.browseProducts>>["data"];
          const mapped = mapProductRows(rows);
          setItems(mapped);
          setTotal(mapped.length);
          setHasMore(false);
          return;
        }
        const params: { limit: number; offset: number; categoryId?: string; subcategoryId?: string } = {
          limit: PAGE_SIZE,
          offset: 0,
        };
        if (subcategoryId.trim()) params.subcategoryId = subcategoryId.trim();
        else if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();
        const res = await catalogApi.browseProducts(params);
        if (cancelled) return;
        const rows = res.data ?? [];
        const totalCount = typeof res.total === "number" ? res.total : rows.length;
        setTotal(totalCount);
        setItems(mapProductRows(rows));
        setHasMore(rows.length >= PAGE_SIZE);
      } catch (error) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setHasMore(false);
        const message = error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : "";
        setLoadError(message || "The product catalog could not be loaded from the main database.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [parentCategoryId, subcategoryId, searchQ]);

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
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
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || loading || loadingMore || !hasMore || searchQ) return;

    const desktopScrollRoot = window.matchMedia("(min-width: 1024px)").matches
      ? productScrollRef.current
      : null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      {
        root: desktopScrollRoot,
        rootMargin: "0px 0px 320px 0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, items.length, loading, loadingMore, parentCategoryId, searchQ, subcategoryId]);

  const filtered = useMemo(() => {
    let data = [...items];
    if (offersOnly) data = data.filter((s) => s.originalPrice > s.price);
    if (ratingFilter) data = data.filter((s) => s.rating > 0 && s.rating >= ratingFilter);
    if (sortBy === "low") data.sort((a, b) => a.price - b.price);
    else if (sortBy === "high") data.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") data.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return data;
  }, [items, offersOnly, ratingFilter, sortBy]);

  const categoriesWithProducts = useMemo(
    () => rootCategories.filter((category) => {
      const productCount = categoryProductCounts[category.id];
      return productCount === undefined || productCount > 0;
    }),
    [categoryProductCounts, rootCategories],
  );

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
    <div className="shop-page-shell min-h-screen font-sans">
      <div className="mx-auto flex w-full max-w-7xl bg-white  flex-col px-4 py-5 md:px-6 lg:py-4">
        {/* Header row */}
        <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-[#202124]">{title}</h1>
            <p className="mt-1 text-sm text-gray-400">Showing results near your selected location</p>
          </div>
          <span className="shrink-0 pt-1 text-sm text-gray-500">{total} products</span>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/85 p-2.5 shadow-[0_12px_32px_rgba(137,207,240,0.08)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
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
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "grid" ? "bg-[#89CFF0]/10 text-[#89CFF0]" : "text-gray-400"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${view === "list" ? "bg-[#89CFF0]/10 text-[#89CFF0]" : "text-gray-400"}`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category circle rail */}
        <div className="shrink-0 rounded-2xl border border-blue-100/80 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
          <CircleRail categories={categoriesWithProducts} selectedId={parentCategoryId} onSelect={(id) => { setParentCategoryId(id); setSubcategoryId(""); }} />
        </div>

        {/* Subcategories */}
        {showSubRail && (
          <div className="mt-4 shrink-0">
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

        {/* Products and desktop filters */}
        <div className={`grid gap-5 lg:h-[min(70vh,760px)] lg:min-h-[520px] lg:grid-cols-[230px_minmax(0,1fr)] lg:overflow-hidden ${showAllProductsHeading ? "" : "mt-5"}`}>
          <aside className="hidden rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-[0_12px_35px_rgba(32,33,36,0.06)] lg:block lg:h-full lg:overflow-y-auto marketplace-scroll-panel">
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-bold text-neutral-950">Category</h3>
                <button type="button" onClick={() => { setParentCategoryId(""); setSubcategoryId(""); }} className={`mb-2 flex w-full items-center justify-between gap-2 text-left text-sm ${!parentCategoryId ? "font-bold text-[#89CFF0]" : "text-slate-700 hover:text-[#89CFF0]"}`}>
                  <span className="min-w-0 truncate">All products</span>
                  <span className="shrink-0 rounded-full bg-[#89CFF0] px-2 py-0.5 text-[11px] font-semibold leading-4 text-white">{categoryProductCounts[ALL_CATEGORIES_COUNT_KEY] ?? 0}</span>
                </button>
                {categoriesWithProducts.map((category) => (
                  <button key={category.id} type="button" onClick={() => { setParentCategoryId(category.id); setSubcategoryId(""); }} className={`mb-2 flex w-full items-center justify-between gap-2 text-left text-sm ${parentCategoryId === category.id ? "font-bold text-[#89CFF0]" : "text-slate-700 hover:text-[#89CFF0]"}`}>
                    <span className="min-w-0 truncate" title={category.name}>{category.name}</span>
                    <span className="shrink-0 rounded-full bg-[#89CFF0] px-2 py-0.5 text-[11px] font-semibold leading-4 text-white">{categoryProductCounts[category.id] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-5">
                <h3 className="mb-3 text-sm font-bold text-neutral-950">Customer rating</h3>
                {[4, 3].map((rating) => <button key={rating} type="button" onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)} className={`mb-2 flex items-center gap-1 text-sm ${ratingFilter === rating ? "font-bold text-[#89CFF0]" : "text-slate-700"}`}><span className="text-[#B8E3F7]">★★★★</span> & up</button>)}
              </div>
              <div className="border-t border-slate-200 pt-5">
                <h3 className="mb-3 text-sm font-bold text-neutral-950">Deals</h3>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={offersOnly} onChange={(e) => setOffersOnly(e.target.checked)} className="h-4 w-4 accent-[#B8E3F7]" /> Deals and discounts</label>
              </div>
            </div>
          </aside>
          <div ref={productScrollRef} className="marketplace-primary-scroll min-w-0 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-2 marketplace-scroll-panel">
          {loading ? (
            <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-red-700 shadow-sm">
              <p className="font-semibold">Unable to load products</p>
              <p className="mt-2 text-sm">{loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white py-24 text-center text-gray-400 shadow-sm">
              No products found. Pick a category or adjust filters.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 xl:grid-cols-3">
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
            <div
              ref={loadMoreSentinelRef}
              className="mt-5 flex min-h-12 items-center justify-center"
              aria-live="polite"
              aria-label={loadingMore ? "Loading more products" : "More products load automatically"}
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#89CFF0]" />
                  Loading more products…
                </span>
              ) : null}
            </div>
          )}
          </div>
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
