
"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useCart } from "@/providers/CartContext";
import {
  Star, MapPin, ChevronLeft, ChevronRight, Search,
  Heart, Filter, Zap, Phone, Mail,
  CheckCircle, Plus, Minus, Tag, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TEAL_GRADIENT } from "./constants";
import { catalogApi } from "@/lib/api/catalog";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";
import { Loader2 } from "lucide-react";
import { pickProductImage, pickVendorImage, resolveMediaUrl } from "@/lib/media";
import { resolveCatalogDisplayOriginal, resolveCatalogUnitPrice } from "@/lib/catalog/resolvePrice";

const TEAL_SOLID = "#0d9488";
 
const FALLBACK_IMAGES: Record<string, string> = {
  Electronics: "https://placehold.co/400x400/1e3a5f/ffffff?text=Electronics",
  Restaurants:  "https://placehold.co/400x400/5f1e1e/ffffff?text=Food",
  Clothing:     "https://placehold.co/400x400/3a1e5f/ffffff?text=Fashion",
  Groceries:    "https://placehold.co/400x400/1e5f2a/ffffff?text=Grocery",
  Medical:      "https://placehold.co/400x400/5f1e1e/ffffff?text=Medical",
  Cosmetics:    "https://placehold.co/400x400/5f1e4a/ffffff?text=Beauty",
  default:      "https://placehold.co/400x400/cccccc/555555?text=Product",
};

type Color = { name: string; hex: string };
type Product = {
  id: string | number;
  name: string;
  brand?: string;
  price: number;
  rating: number;
  reviews: number;
  badge?: string;
  image?: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
  bannerUrls?: string[] | null;
  metadata?: { imageUrl?: string; brand?: string };
  color?: string;
  colors?: Color[];
  category?: string;
};
type Banner = { gradient: string; accent: string; title: string; subtitle: string };

const DEFAULT_BANNER: Banner = {
  gradient: TEAL_GRADIENT,
  accent: TEAL_SOLID,
  title: "Shop trusted products",
  subtitle: "Fast delivery · Quality picks",
};

function normalizeBanner(raw: Partial<Banner> | undefined): Banner {
  if (!raw) return DEFAULT_BANNER;
  return {
    gradient: raw.gradient ?? DEFAULT_BANNER.gradient,
    accent: raw.accent ?? DEFAULT_BANNER.accent,
    title: raw.title ?? DEFAULT_BANNER.title,
    subtitle: raw.subtitle ?? DEFAULT_BANNER.subtitle,
  };
}
function VendorAvatar({ logo, logoColor }: { logo: string; logoColor?: string }) {
  const isUrl = Boolean(
    logo &&
      (logo.startsWith("http") || logo.startsWith("/") || logo.startsWith("data:")),
  );
  const url = isUrl ? resolveMediaUrl(logo) || logo : null;
  return (
    <div
      className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm shrink-0 overflow-hidden"
      style={{ background: logoColor ?? "#f97316", border: `2px solid ${logoColor ?? "#f97316"}55` }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{logo}</span>
      )}
    </div>
  );
}

type Vendor = {
  name: string; logo: string; logoColor?: string; verified?: boolean;
  since: string; category: string; subCategory: string; delivery: string;
  rating: number; phone: string; email: string; address: string;
  banners: Banner[]; tabs: string[]; tabCounts: number[]; products: Product[];
}; 
function ProductImage({ product, vendorCategory }: { product: Product; vendorCategory: string }) {
  const [errored, setErrored] = useState(false);

  const src =
    pickProductImage({
      thumbnailUrl: product.thumbnailUrl,
      bannerUrls: product.bannerUrls,
      image: product.image,
      metadata: product.metadata,
    }) ||
    (product.imageUrl ? resolveMediaUrl(product.imageUrl) : null);

  const fallback =
    FALLBACK_IMAGES[product.category ?? vendorCategory] ?? FALLBACK_IMAGES.default;

  if (!src || errored) {
    return (
      <img
        src={fallback}
        alt={product.name}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={product.name}
      onError={() => setErrored(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
 
function VendorBanner({ banners, vendorName }: { banners: Banner[]; vendorName: string }) {
  const slides =
    banners.length > 0
      ? banners.map((x) => normalizeBanner(x))
      : [normalizeBanner({ ...DEFAULT_BANNER, title: vendorName || DEFAULT_BANNER.title })];
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (direction: "next" | "prev") => {
    if (animating || slides.length === 0) return;
    setDir(direction);
    setAnimating(true);
    const len = slides.length;
    setTimeout(() => {
      setCurrent((prev) =>
        direction === "next"
          ? (prev + 1) % len
          : (prev - 1 + len) % len
      );
      setAnimating(false);
    }, 350);
  };

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    timerRef.current = setInterval(() => go("next"), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, animating, slides.length]);

  const safeIndex = slides.length ? Math.min(current, slides.length - 1) : 0;
  const b = normalizeBanner(slides[safeIndex]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl" style={{ height: "clamp(120px, 22vw, 400px)" }}>
      <div className="absolute inset-0 transition-all duration-700" style={{ background: b.gradient }} />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 38px,${b.accent}33 38px,${b.accent}33 39px),
                          repeating-linear-gradient(90deg,transparent,transparent 38px,${b.accent}33 38px,${b.accent}33 39px)`,
      }} />
      <div className="absolute" style={{
        width: "45%", height: "90%", right: "2%", top: "5%",
        background: `radial-gradient(circle, ${b.accent}2a 0%, transparent 70%)`,
        borderRadius: "50%",
      }} />
      <div className="absolute inset-0 flex items-center px-4 sm:px-8 md:px-12" style={{
        opacity: animating ? 0 : 1,
        transform: animating ? (dir === "next" ? "translateX(-24px)" : "translateX(24px)") : "translateX(0)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}>
        <div className="flex-1 max-w-[70%]">
          <div className="text-[9px] sm:text-xs font-semibold mb-1 sm:mb-2 opacity-60" style={{ color: b.accent }}>
            @{vendorName.toLowerCase().replace(/\s+/g, "")}
          </div>
          <h1 className="font-semibold leading-none text-white mb-2 sm:mb-3" style={{
            fontSize: "clamp(0.95rem, 3vw, 3rem)",
            textShadow: `0 0 40px ${b.accent}55`,
            letterSpacing: "-0.02em",
          }}>
            {b.title}
          </h1>
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-white text-[10px] sm:text-sm" style={{
            background: `${b.accent}2a`, border: `1px solid ${b.accent}55`, backdropFilter: "blur(4px)",
          }}>
            <Zap size={10} style={{ color: b.accent }} />
            {b.subtitle}
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button onClick={() => go("prev")} className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-0.5 transition-all border border-white/30">
            <ChevronLeft className="w-2.5 h-2.5 text-white" />
          </button>
          <button onClick={() => go("next")} className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full p-0.5 transition-all border border-white/30">
            <ChevronRight className="w-2.5 h-2.5 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="h-1 sm:h-1.5 rounded-full transition-all duration-300" style={{
                width: i === current ? 16 : 5,
                background: i === current ? b.accent : "rgba(255,255,255,0.35)",
                boxShadow: i === current ? `0 0 6px ${b.accent}` : "none",
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
 
function VendorInfoCard({ vendor }: { vendor: Vendor }) {
  const stats = [
    { label: "Business",   value: vendor.category    },
    { label: "Categories", value: vendor.subCategory },
    { label: "Delivery",   value: vendor.delivery    },
    { label: "Rating",     value: null               },
  ];
  return (
    <div className="bg-white rounded-2xl px-4 sm:px-5 py-4 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <VendorAvatar logo={vendor.logo} logoColor={vendor.logoColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">{vendor.name}</h2>
            {vendor.verified && <CheckCircle size={16} className="text-emerald-500 fill-emerald-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Seller Since {vendor.since}
          </div>
          <div className="flex items-stretch mt-3 overflow-x-auto pb-0.5 gap-0 no-scrollbar">
            {stats.map((item, i) => (
              <div key={item.label} className="flex items-stretch shrink-0">
                <div className="pr-3 sm:pr-5">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight whitespace-nowrap">{item.label}</p>
                  {item.value ? (
                    <p className="text-[11px] sm:text-xs font-bold text-gray-800 mt-0.5 whitespace-nowrap">{item.value}</p>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span className="text-[11px] sm:text-xs font-bold text-gray-800 whitespace-nowrap">{vendor.rating}/5</span>
                    </div>
                  )}
                </div>
                {i < 3 && <div className="w-px bg-gray-200 mx-1 self-stretch" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-700 mb-2">Contact Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <div className="flex items-center gap-2"><Phone size={12} className="text-emerald-500 shrink-0" /><span className="text-xs text-gray-600">{vendor.phone}</span></div>
          <div className="flex items-center gap-2"><Mail size={12} className="text-blue-500 shrink-0" /><span className="text-xs text-gray-600 truncate">{vendor.email}</span></div>
          <div className="flex items-start gap-2 sm:col-span-2"><MapPin size={12} className="text-red-400 shrink-0 mt-0.5" /><span className="text-xs text-gray-600 leading-relaxed">{vendor.address}</span></div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white rounded-full" style={{ background: TEAL_GRADIENT }}><Phone size={10} /> Send Message</button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"><MapPin size={10} /> Directions</button>
        </div>
      </div>
    </div>
  );
}
 
function VendorInfoCardDesktop({ vendor }: { vendor: Vendor }) {
  const stats = [
    { label: "Business",       value: vendor.category    },
    { label: "Categories Tag", value: vendor.subCategory },
    { label: "Delivery Info",  value: vendor.delivery    },
    { label: "Rating",         value: null               },
  ];
  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center gap-4">
        <VendorAvatar logo={vendor.logo} logoColor={vendor.logoColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 leading-tight">{vendor.name}</h2>
            {vendor.verified && <CheckCircle size={18} className="text-emerald-500 fill-emerald-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Seller Since {vendor.since}
          </div>
          <div className="flex flex-wrap items-center gap-0 mt-3">
            {stats.map((item, i) => (
              <div key={item.label} className="flex items-stretch">
                <div className="pr-5">
                  <p className="text-[10px] text-gray-400 leading-tight">{item.label}</p>
                  {item.value ? (
                    <p className="text-xs font-bold text-gray-800 mt-0.5">{item.value}</p>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-gray-800">{vendor.rating}/5</span>
                    </div>
                  )}
                </div>
                {i < 3 && <div className="w-px bg-gray-200 mx-1 self-stretch" />}
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 pl-4 border-l border-gray-100 min-w-[200px]">
          <p className="text-xs font-semibold text-gray-700 mb-2">Contact Details</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><Phone size={12} className="text-emerald-500 shrink-0" /><span className="text-xs text-gray-600">{vendor.phone}</span></div>
            <div className="flex items-center gap-2"><Mail size={12} className="text-blue-500 shrink-0" /><span className="text-xs text-gray-600 truncate max-w-[160px]">{vendor.email}</span></div>
            <div className="flex items-start gap-2"><MapPin size={12} className="text-red-400 shrink-0 mt-0.5" /><span className="text-xs text-gray-600 leading-relaxed">{vendor.address}</span></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg" style={{ background: TEAL_GRADIENT }}><Phone size={10} /> Send Message</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"><MapPin size={10} /> Directions</button>
          </div>
        </div>
      </div>
    </div>
  );
} 
function ProductCard({ product, onProductClick, vendorId, vendorName, vendorCategory, liked, wishlistBusy, onToggleWishlist }: {
  product: Product;
  onProductClick: (p: Product) => void;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  liked: boolean;
  wishlistBusy: boolean;
  onToggleWishlist: (productId: string | number) => void;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState<Color | null>(product.colors?.[0] ?? null);

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.price,
      image: product.image,
      imageUrl: product.imageUrl,
      vendor: vendorName,
      vendorId,
      color: selectedColor?.name || product.color,
      delivery: "Delivery in 30 Mins",
    });
  }

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.10)", border: "1px solid #f0f0f0", transition: "box-shadow 0.2s, transform 0.2s" }}
      onClick={() => onProductClick(product)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.16)";
        e.currentTarget.style.transform = "translateY(-3px)";
        if (product.id) {
          const pid = String(product.id);
          const path = `/shop/${vendorId}/${pid}`;
          router.prefetch(path);
          void catalogApi.prefetchProduct(pid);
        }
      }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(0)"; }}
    > 
      <div className="relative overflow-hidden w-full" style={{ height: "clamp(120px, 20vw, 180px)" }}>
        {product.badge && (
          <div
            className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold"
            style={{ border: "1.5px solid #3aaa8e", color: "#3aaa8e", background: "rgba(255,255,255,0.85)" }}
          >
            {product.badge}
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          disabled={wishlistBusy}
          className="absolute top-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-md hover:scale-110 transition-all"
        >
          <Heart size={11} className={liked ? "fill-red-500 text-red-500" : "text-gray-400"} />
        </button> 
        <ProductImage product={product} vendorCategory={vendorCategory} />

        {product.colors && (
          <div className="absolute bottom-2 right-2 z-10 flex gap-1">
            {product.colors.map((c) => (
              <button
                key={c.name}
                onClick={(e) => { e.stopPropagation(); setSelectedColor(c); }}
                title={c.name}
                style={{ width: 14, height: 14, borderRadius: 4, background: c.hex, border: selectedColor?.name === c.name ? "2px solid #3aaa8e" : "2px solid transparent", cursor: "pointer", outline: "none", transition: "border 0.15s" }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 sm:p-3">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{product.name}</h3>
        <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-1">
          <div className="flex items-center gap-1">
            {selectedColor && <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{selectedColor.name}</span>}
            {!selectedColor && product.color && <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{product.color}</span>}
            <span className="text-[12px] sm:text-[13px] font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: "#fffbea" }}>
            <Star size={9} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-600">{product.rating}</span>
            <span className="text-[9px] text-gray-400 hidden sm:inline">({product.reviews})</span>
          </div>
        </div>
        <div className="border-t border-gray-100 mb-2 sm:mb-3" />
        <div className="flex items-center gap-1.5 mt-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center rounded-xl overflow-hidden bg-white" style={{ border: "1.5px solid #e0e0e0" }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex items-center justify-center hover:bg-gray-50 transition-all" style={{ width: 26, height: 28, color: "#555" }}><Minus size={10} /></button>
            <span className="text-xs font-semibold text-gray-900 text-center" style={{ minWidth: 20, padding: "4px 4px", borderLeft: "1px solid #e0e0e0", borderRight: "1px solid #e0e0e0" }}>{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="flex items-center justify-center hover:bg-gray-50 transition-all" style={{ width: 26, height: 28, color: "#555" }}><Plus size={10} /></button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 text-[11px] sm:text-[12px] font-bold text-gray-900 rounded-xl transition-all active:scale-95 whitespace-nowrap"
            style={{ height: 30, border: "1.5px solid #e0e0e0", background: "#fff" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ccc"; e.currentTarget.style.background = "#f5f5f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.background = "#fff"; }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
} 
type SidebarProps = {
  brands: string[]; selectedBrands: string[]; toggleBrand: (b: string) => void;
  offersOnly: boolean; setOffersOnly: (v: boolean) => void;
  ratingFilter: number | null; setRatingFilter: (v: number | null) => void;
};

function SidebarContent({ brands, selectedBrands, toggleBrand, offersOnly, setOffersOnly, ratingFilter, setRatingFilter }: SidebarProps) {
  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-500">Brands</span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {brands.map((brand) => {
            const active = selectedBrands.includes(brand);
            return (
              <label key={brand} className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => toggleBrand(brand)} className="w-4 h-4 rounded flex items-center justify-center transition-all shrink-0"
                  style={active ? { background: TEAL_GRADIENT } : { border: "2px solid #d1d5db", backgroundColor: "#fafafa" }}>
                  {active && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span className="text-sm font-medium" style={{ color: active ? TEAL_SOLID : "#4b5563" }}>{brand}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl px-4 py-3 bg-white shadow-sm border border-gray-100">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-3 flex items-center gap-2 text-gray-500">
          <Tag className="w-3.5 h-3.5" style={{ color: TEAL_SOLID }} /> Offers
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setOffersOnly(!offersOnly)} className="w-4 h-4 rounded flex items-center justify-center transition-all shrink-0"
            style={offersOnly ? { background: TEAL_GRADIENT } : { border: "2px solid #d1d5db", backgroundColor: "#fafafa" }}>
            {offersOnly && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className="text-sm font-medium" style={{ color: offersOnly ? TEAL_SOLID : "#4b5563" }}>Show deals only</span>
          {offersOnly && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: TEAL_GRADIENT }}>ON</span>}
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
                <div onClick={() => setRatingFilter(active ? null : r)} className="w-4 h-4 rounded-full flex items-center justify-center transition-all shrink-0"
                  style={active ? { background: TEAL_GRADIENT, padding: "2px" } : { border: "2px solid #d1d5db", backgroundColor: "#fafafa" }}>
                  {active && <div className="w-full h-full rounded-full bg-white" style={{ opacity: 0.9 }} />}
                </div>
                <span className="text-sm font-medium flex items-center gap-1" style={{ color: active ? TEAL_SOLID : "#4b5563" }}>
                  {Array.from({ length: Math.floor(r) }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
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
 
type VendorDetailPageProps = {
  vendorId: string;
  onBack?: () => void;
} 
export default function VendorDetailPage({ vendorId, onBack }: VendorDetailPageProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [offersOnly, setOffersOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistBusyId, setWishlistBusyId] = useState<string>("");

  useEffect(() => {
    if (!vendorId) {
      setLoadingVendor(false);
      return;
    }
    const vid = vendorId;
    Promise.all([
      catalogApi.getVendor(vid),
      catalogApi.getVendorProducts(vid, { limit: 50 }),
    ]).then(([v, productsRes]) => {
      setVendor({
        id: String(v.id),
        name: (v as any).businessName || v.name,
        logoColor: "#0d9488",
        logo: pickVendorImage(v as any) || "🏪",
        verified: true,
        since: "2024",
        category: "General",
        subCategory: v.description ?? "",
        rating: v.rating ?? 0,
        reviews: 0,
        delivery: "Delivery",
        phone: (v as any).phone ?? "",
        email: (v as any).email ?? "",
        address: (v as any).address ?? "",
        banners: (v as any).banners ?? [],
        tabs: ["All"],
        tabCounts: [productsRes.data.length],
        products: productsRes.data.map((p) => {
          const row = p as unknown as Record<string, unknown>;
          const unit = resolveCatalogUnitPrice(row);
          return {
          id: p.id,
          name: p.name,
          color: "",
          price: unit,
          originalPrice: resolveCatalogDisplayOriginal(row, unit),
          rating: 0,
          reviews: 0,
          thumbnailUrl: (p as any).thumbnailUrl,
          bannerUrls: (p as any).bannerUrls,
          image: pickProductImage(p as any) || "",
          metadata: p.metadata,
          brand: p.metadata?.brand ?? "",
          badge: null,
          badgeColor: null,
        };
        }),
      } as any);
    }).catch(() => {
      setVendor(null);
    }).finally(() => setLoadingVendor(false));
  }, [vendorId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWishlistIds(new Set());
      return;
    }
    profileApi
      .getWishlist()
      .then((rows) => {
        setWishlistIds(new Set(rows.map((r) => String(r.productId))));
      })
      .catch(() => setWishlistIds(new Set()));
  }, [isLoggedIn]);

  async function toggleWishlist(productId: string | number) {
    const key = String(productId);
    if (wishlistBusyId === key) return;
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    const exists = wishlistIds.has(key);
    const nextSet = new Set(wishlistIds);
    if (exists) nextSet.delete(key);
    else nextSet.add(key);
    setWishlistIds(nextSet);
    setWishlistBusyId(key);
    try {
      if (exists) await profileApi.removeFromWishlist(productId);
      else await profileApi.addToWishlist(productId);
    } catch {
      setWishlistIds(new Set(wishlistIds));
    } finally {
      setWishlistBusyId("");
    }
  }

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);

  const brands = useMemo<string[]>(() =>
    Array.from(new Set((vendor?.products ?? []).map((p) => p.brand).filter((b): b is string => Boolean(b)))).sort(),
    [vendor]
  );

  const filteredProducts = useMemo<Product[]>(() => {
    if (!vendor) return [];
    let data = [...vendor.products];
    if (search)                data = data.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedBrands.length) data = data.filter((p) => p.brand && selectedBrands.includes(p.brand));
    if (ratingFilter !== null) data = data.filter((p) => p.rating >= ratingFilter);
    if (offersOnly)            data = data.filter((p) => Boolean(p.badge));
    return data;
  }, [vendor, search, selectedBrands, ratingFilter, offersOnly]);

  const activeFilters: string[] = [
    ratingFilter !== null ? `⭐ ${ratingFilter}+` : null,
    offersOnly ? "Deals" : null,
    ...selectedBrands,
  ].filter((f): f is string => f !== null);

  const removeFilter = (f: string) => {
    if (f.startsWith("⭐")) setRatingFilter(null);
    else if (f === "Deals") setOffersOnly(false);
    else toggleBrand(f);
  };

  const sidebarProps: SidebarProps = { brands, selectedBrands, toggleBrand, offersOnly, setOffersOnly, ratingFilter, setRatingFilter };

  if (loadingVendor) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Vendor not found.</p>
        <button onClick={onBack} className="mt-4 text-sm text-emerald-600 underline">← Back to Shop</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5">

        <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-gray-400 mb-3 sm:mb-4 overflow-x-auto whitespace-nowrap pb-0.5">
          <span className="hover:text-gray-600 cursor-pointer" onClick={onBack}>Shop</span>
          <span className="text-gray-300">›</span>
          <span className="hover:text-gray-600 cursor-pointer" onClick={onBack}>{vendor.category}</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-700 font-semibold">{vendor.name}</span>
        </div>

        <div className="mb-3 sm:mb-4">
          <VendorBanner banners={vendor.banners} vendorName={vendor.name} />
        </div>

        <div className="lg:hidden"><VendorInfoCard vendor={vendor} /></div>
        <div className="hidden lg:block"><VendorInfoCardDesktop vendor={vendor} /></div>

        <div className="flex gap-4 lg:gap-5 items-start">
          <aside className="hidden lg:block w-52 shrink-0 sticky top-4">
            <SidebarContent {...sidebarProps} />
          </aside>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white p-4 overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-gray-800 text-sm">Filters</span>
                  <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <SidebarContent {...sidebarProps} />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">Seller Products</h3>
                <p className="text-xs text-gray-400 mt-0.5">{filteredProducts.length} results</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 shadow-sm shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Filters
                  {activeFilters.length > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: TEAL_GRADIENT }}>{activeFilters.length}</span>
                  )}
                </button>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-1 sm:flex-none">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
                    className="text-xs px-2.5 sm:px-3 py-2 outline-none w-full sm:w-32 md:w-40 bg-transparent" />
                  <button className="px-2.5 sm:px-3 py-2 text-white shrink-0" style={{ background: TEAL_GRADIENT }}><Search size={12} /></button>
                </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
                {activeFilters.map((f) => (
                  <span key={f} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold text-white shadow-sm" style={{ background: TEAL_GRADIENT }}>
                    {f}
                    <button onClick={() => removeFilter(f)} className="hover:opacity-70"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                <button onClick={() => { setSelectedBrands([]); setRatingFilter(null); setOffersOnly(false); }} className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">Clear all</button>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 mb-4 sm:mb-5 no-scrollbar">
              {vendor.tabs.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all whitespace-nowrap shrink-0"
                  style={activeTab === i ? { background: TEAL_GRADIENT, color: "white", borderColor: "transparent" } : { background: "#f9fafb", color: "#6b7280", borderColor: "#e5e7eb" }}>
                  {tab}
                  <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full"
                    style={activeTab === i ? { background: "rgba(255,255,255,0.2)", color: "white" } : { background: "#f3f4f6", color: "#9ca3af" }}>
                    {vendor.tabCounts[i]}
                  </span>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-12 sm:py-16 text-center text-gray-400 text-sm">No products found. Try adjusting your filters.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    vendorId={vendorId}
                    vendorName={vendor.name}
                    vendorCategory={vendor.category}
                    liked={wishlistIds.has(String(product.id))}
                    wishlistBusy={wishlistBusyId === String(product.id)}
                    onToggleWishlist={toggleWishlist}
                    onProductClick={(p) => {
                      router.push(`/shop/${vendorId}/${p.id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}