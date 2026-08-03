"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, MapPin, PackageSearch, ShieldCheck, Star } from "lucide-react";
import { catalogApi } from "@/lib/api/catalog";
import { pickServiceImage, pickVendorImage, resolveMediaUrl } from "@/lib/media";

type ProductCard = { id: string; vendorId: string; name: string; image: string; price: number; originalPrice: number };
type ServiceCard = { id: string; name: string; image: string; price: number };
type VendorCard = { id: string; name: string; image: string; description: string; rating: number };

const PARTNER_PROFILE_IMAGES = [
  "https://i.pravatar.cc/240?img=12",
  "https://i.pravatar.cc/240?img=32",
  "https://i.pravatar.cc/240?img=47",
  "https://i.pravatar.cc/240?img=56",
  "https://i.pravatar.cc/240?img=68",
  "https://i.pravatar.cc/240?img=5",
];

function partnerProfileImage(name: string) {
  const seed = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return PARTNER_PROFILE_IMAGES[seed % PARTNER_PROFILE_IMAGES.length];
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (!result || typeof result !== "object") return [];
  const container = result as { data?: unknown; items?: unknown };
  if (Array.isArray(container.items)) return container.items as T[];
  if (Array.isArray(container.data)) return container.data as T[];
  if (container.data && typeof container.data === "object") {
    const nested = container.data as { items?: unknown; data?: unknown };
    if (Array.isArray(nested.items)) return nested.items as T[];
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

function money(value: number) {
  return `₹${Math.max(0, value).toLocaleString("en-IN")}`;
}

function RailButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50" aria-label={`Scroll ${direction}`}>
      <Icon className="h-5 w-5" />
    </button>
  );
}

function SectionHeader({ title, subtitle, href, rail }: { title: string; subtitle: string; href: string; rail?: React.RefObject<HTMLDivElement> }) {
  const scroll = (direction: number) => rail?.current?.scrollBy({ left: direction * Math.min(760, window.innerWidth * 0.75), behavior: "smooth" });
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-7">
      <div>
        <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#202124] sm:text-[28px]">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-500 sm:text-base">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {rail ? <><RailButton direction="left" onClick={() => scroll(-1)} /><RailButton direction="right" onClick={() => scroll(1)} /></> : null}
        <Link href={href} className="ml-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#EAF4FF] px-3.5 py-2 text-xs font-bold text-[#89CFF0] transition hover:bg-[#D8ECFF] sm:text-sm">See all <ArrowRight className="h-4 w-4 shrink-0" /></Link>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return <div className="h-[360px] w-[240px] shrink-0 animate-pulse rounded-3xl border border-slate-100 bg-white p-3 sm:w-[268px]"><div className="aspect-square rounded-2xl bg-slate-100" /><div className="mt-4 h-4 w-4/5 rounded bg-slate-100" /><div className="mt-3 h-5 w-2/5 rounded bg-slate-100" /></div>;
}

function LocalPickBadge() {
  return (
    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-[#C9E3FF] bg-[#EAF4FF] py-1.5 pl-1.5 pr-3 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#89CFF0] shadow-[0_6px_18px_rgba(137,207,240,.18)] ring-1 ring-blue-950/5 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_9px_22px_rgba(137,207,240,.24)]">
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/80" />
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#89CFF0] ring-1 ring-white/50">
        <MapPin className="h-3 w-3 fill-white text-white" aria-hidden="true" />
      </span>
      <span className="relative">Local pick</span>
    </span>
  );
}

export default function MarketplaceHome() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const productRail = useRef<HTMLDivElement>(null);
  const serviceRail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      catalogApi.browseProducts({ limit: 16, offset: 0 }),
      catalogApi.getServices({ limit: 12, offset: 0 }),
      catalogApi.getVendors({ limit: 8, offset: 0 }),
    ]).then(([productResult, serviceResult, vendorResult]) => {
      if (cancelled) return;
      if (productResult.status === "fulfilled") {
        setProducts(rowsOf<any>(productResult.value).map((row) => {
          const price = Number(row.finalPrice ?? row.sellPrice ?? row.price ?? 0);
          const originalPrice = Number(row.mrp ?? row.compareAtPrice ?? price);
          const rawImage = row.thumbnailUrl || row.image || row.imageUrl || row.metadata?.imageUrl || "";
          return { id: String(row.id), vendorId: String(row.vendorId ?? ""), name: String(row.name || "Product"), image: resolveMediaUrl(rawImage) || rawImage, price, originalPrice };
        }));
      }
      if (serviceResult.status === "fulfilled") {
        setServices(rowsOf<any>(serviceResult.value).map((row) => ({ id: String(row.id), name: String(row.name || "Service"), image: resolveMediaUrl(pickServiceImage(row)) || pickServiceImage(row) || "", price: Number(row.basePrice ?? row.price ?? row.metadata?.price ?? 0) })));
      }
      if (vendorResult.status === "fulfilled") {
        setVendors(rowsOf<any>(vendorResult.value).map((row) => ({ id: String(row.id), name: String(row.businessName || row.name || "Local vendor"), image: resolveMediaUrl(pickVendorImage(row)) || pickVendorImage(row) || "", description: String(row.description || row.ownerName || "Trusted Planext4u partner"), rating: Number(row.rating ?? 4.8) })));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl bg-white  space-y-6 px-4 py-6 sm:px-6 lg:space-y-8 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[24px] border border-[#D7E7F5] bg-white p-5 shadow-[0_14px_40px_rgba(31,74,125,.07)] sm:p-7 lg:rounded-[30px] lg:p-8">
        <SectionHeader title="Recommended for you" subtitle="Popular products picked from trusted sellers near you." href="/shop" rail={products.length > 4 ? productRail : undefined} />
        <div ref={productRail} className={products.length > 4 ? "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {loading ? Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />) : products.length ? products.map((product) => (
            <Link key={product.id} href={product.vendorId ? `/shop/${product.vendorId}/${product.id}` : "/shop"} className={`group snap-start overflow-hidden rounded-3xl border border-[#DCE8F3] bg-white p-3 transition duration-300 hover:-translate-y-1 hover:border-[#90CAF9] hover:shadow-[0_18px_38px_rgba(137,207,240,.14)] ${products.length > 4 ? "w-[240px] shrink-0 sm:w-[268px]" : "w-full"}`}>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-[#F7FBFF] to-[#EAF4FF] p-3">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" /> : <PackageSearch className="h-12 w-12 text-slate-300" />}<LocalPickBadge /></div>
              <div className="px-1 pb-1 pt-3">
                <h3 className="line-clamp-2 min-h-11 text-[15px] font-semibold leading-[1.4] text-[#202124]">{product.name}</h3>
                <div className="mt-2 flex items-baseline gap-2"><span className="text-xl font-extrabold tracking-tight text-[#202124]">{money(product.price)}</span>{product.originalPrice > product.price ? <span className="text-xs text-slate-400 line-through">{money(product.originalPrice)}</span> : null}</div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs font-semibold text-emerald-700">Available nearby</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF4FF] text-[#89CFF0]"><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></div>
              </div>
            </Link>
          )) : <div className="w-full py-12 text-center text-sm text-slate-500">No products are available right now.</div>}
        </div>
      </section>
 

      <section className="overflow-hidden rounded-[24px] border border-[#D7E7F5] bg-white p-5 shadow-[0_14px_40px_rgba(31,74,125,.07)] sm:p-7 lg:rounded-[30px] lg:p-8">
        <SectionHeader title="Popular services near you" subtitle="Book skilled, verified professionals for everyday needs." href="/service" rail={services.length > 4 ? serviceRail : undefined} />
        <div ref={serviceRail} className={services.length > 4 ? "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {loading ? Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />) : services.length ? services.map((service) => (
            <Link key={service.id} href={`/service?serviceId=${encodeURIComponent(service.id)}`} className={`group snap-start overflow-hidden rounded-3xl border border-[#DCE8F3] bg-white p-3 transition duration-300 hover:-translate-y-1 hover:border-[#90CAF9] hover:shadow-[0_18px_38px_rgba(137,207,240,.14)] ${services.length > 4 ? "w-[280px] shrink-0 sm:w-[310px]" : "w-full"}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-50 to-[#EAF4FF]">{service.image ? <img src={service.image} alt={service.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <BriefcaseBusiness className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-slate-300" />}<span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#89CFF0] shadow-sm">Verified service</span></div>
              <div className="px-1 pb-1 pt-3"><h3 className="line-clamp-2 min-h-11 text-base font-bold leading-snug text-[#202124]">{service.name}</h3><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-sm font-bold text-[#202124]">{service.price > 0 ? `From ${money(service.price)}` : "View pricing"}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF4FF] text-[#89CFF0]"><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span></div></div>
            </Link>
          )) : <div className="w-full py-12 text-center text-sm text-slate-500">No services are available right now.</div>}
        </div>
      </section>

      {vendors.length > 0 && (
        <section className="rounded-[24px] border border-[#D7E7F5] bg-white p-5 shadow-[0_14px_40px_rgba(31,74,125,.07)] sm:p-7 lg:rounded-[30px] lg:p-8">
          <SectionHeader title="Trusted local partners" subtitle="Discover highly rated stores and providers in your area." href="/shop" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {vendors.slice(0, 4).map((vendor) => (
              <Link
                key={vendor.id}
                href={`/shop/${vendor.id}`}
                className="group flex min-h-[250px] flex-col items-center rounded-3xl border border-[#DCE8F3] bg-gradient-to-b from-white to-[#F7FBFF] p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-[#90CAF9] hover:shadow-[0_18px_38px_rgba(137,207,240,.14)]"
              >
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-sm sm:h-24 sm:w-24">
                  <img
                    src={vendor.image || partnerProfileImage(vendor.name)}
                    alt={`${vendor.name} profile`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mt-4 max-w-full truncate text-lg font-extrabold capitalize text-[#202124]">{vendor.name}</h3>
                <p className="mt-1 max-w-full truncate text-xs text-slate-500">{vendor.description}</p>
                <div className="mt-3 flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-neutral-800">
                  <Star className="h-3.5 w-3.5 fill-[#B8E3F7] text-[#B8E3F7]" /> {vendor.rating.toFixed(1)}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-neutral-900">
                  Visit store <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
