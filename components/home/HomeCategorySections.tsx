/* eslint-disable @next/next/no-img-element -- Catalog media URLs are supplied dynamically by the API. */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Star, Store } from "lucide-react";
import { catalogApi, type Category, type Vendor } from "@/lib/api/catalog";
import { pickVendorImage, resolveMediaUrl } from "@/lib/media";

type HomeCategory = Category & {
  displayOrder?: number;
  display_order?: number;
  isTrending?: boolean;
  is_trending?: boolean;
};

function categoryImage(category: HomeCategory): string {
  return resolveMediaUrl(category.thumbnailUrl || category.iconUrl || category.image || "") || "";
}

function orderedRoots(rows: HomeCategory[]): HomeCategory[] {
  return rows
    .filter((row) => !row.parentId && row.isActive !== false)
    .sort((a, b) => Number(a.displayOrder ?? a.display_order ?? 999) - Number(b.displayOrder ?? b.display_order ?? 999));
}

function useCategories(kind: "product" | "service") {
  const [rows, setRows] = useState<HomeCategory[]>([]);
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .getCategories({ limit: kind === "product" ? 200 : 100, kind })
      .then((result) => {
        if (!cancelled) setRows(orderedRoots((result.data || []) as HomeCategory[]));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);
  return rows;
}

function CategoryTile({ category, service = false }: { category: HomeCategory; service?: boolean }) {
  const image = categoryImage(category);
  const href = service
    ? `/service?categoryId=${encodeURIComponent(category.id)}`
    : `/shop?categoryId=${encodeURIComponent(category.id)}`;
  return (
    <Link href={href} className="group min-w-20 text-center sm:min-w-24">
      <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-teal-100 bg-teal-50 transition group-hover:-translate-y-0.5 group-hover:shadow-md sm:h-16 sm:w-16">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl">{service ? "🛠️" : "🛍️"}</span>}
      </span>
      <span className="mt-2 block max-w-24 truncate text-xs font-bold text-slate-800">{category.name}</span>
    </Link>
  );
}

export function HomeCategoryRail() {
  const categories = useCategories("product");
  if (!categories.length) return null;
  return (
    <section aria-label="Product categories" className="mx-auto max-w-[1400px] overflow-x-auto px-3 py-3 sm:px-4 md:px-6">
      <div className="flex min-w-max gap-3 sm:gap-5">
        {categories.slice(0, 12).map((category) => <CategoryTile key={category.id} category={category} />)}
      </div>
    </section>
  );
}

export function HomeCategoryGrid() {
  const categories = useCategories("product");
  const trending = useMemo(
    () => categories.filter((row) => row.isTrending === true || row.is_trending === true),
    [categories],
  );
  if (!categories.length) return null;
  return (
    <section className="mx-auto mt-4 max-w-[1400px] px-3 sm:px-4 md:px-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 sm:text-2xl">Shop by Category</h2>
          <Link href="/shop" className="text-sm font-bold text-teal-700">View all</Link>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-10">
          {categories.slice(0, 20).map((category) => <CategoryTile key={category.id} category={category} />)}
        </div>
        {trending.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-4 font-black text-slate-900">🔥 Trending Categories</h3>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {trending.map((category) => <CategoryTile key={category.id} category={category} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type HomeVendor = Vendor & {
  city?: string | null;
  state?: string | null;
  status?: string | null;
  isVerified?: boolean;
  is_verified?: boolean;
};

export function HomeVendorSection() {
  const [vendors, setVendors] = useState<HomeVendor[]>([]);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .getVendors({ limit: 16, vendorKind: "product" })
      .then((result) => {
        if (cancelled) return;
        const rows = ((result.data || []) as HomeVendor[])
          .filter((vendor) => vendor.id && vendor.isActive !== false)
          .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        setVendors(rows.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setVendors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!vendors.length) return null;

  return (
    <section aria-labelledby="shop-by-vendor-title" className="mx-auto mt-4 max-w-[1400px] px-3 sm:px-4 md:px-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-6 w-6 text-teal-700" aria-hidden />
          <h2 id="shop-by-vendor-title" className="text-lg font-black text-slate-900 sm:text-2xl">
            Shop by Vendor
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {vendors.map((vendor) => {
            const image = pickVendorImage(vendor);
            const name = vendor.businessName?.trim() || vendor.name?.trim() || "Vendor";
            const location = [vendor.city, vendor.state].filter(Boolean).join(", ");
            const rating = Number(vendor.rating || 0);
            const verified = vendor.isVerified === true || vendor.is_verified === true || vendor.status?.toLowerCase() === "approved";
            return (
              <Link
                key={vendor.id}
                href={`/shop/${encodeURIComponent(vendor.id)}`}
                aria-label={`Shop from ${name}`}
                className="group w-[156px] min-w-[156px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:w-[180px] sm:min-w-[180px]"
              >
                <div className="relative h-28 overflow-hidden bg-teal-50 sm:h-32">
                  {image ? (
                    <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-teal-600">
                      <Store className="h-10 w-10" aria-hidden />
                    </div>
                  )}
                  {verified && (
                    <span className="absolute right-2 top-2 rounded-full bg-white p-1 text-teal-600 shadow" title="Verified vendor">
                      <BadgeCheck className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-900">{name}</h3>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-slate-500">{location || "View products"}</span>
                    {rating > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 font-bold text-slate-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                        {rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export function HomeServiceCategories() {
  const categories = useCategories("service");
  if (!categories.length) return null;
  return (
    <section className="mx-auto mt-4 max-w-[1400px] px-3 sm:px-4 md:px-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 sm:text-2xl">Services for You</h2>
          <Link href="/service" className="text-sm font-bold text-teal-700">View all</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {categories.slice(0, 16).map((category) => <CategoryTile key={category.id} category={category} service />)}
        </div>
      </div>
    </section>
  );
}

export function HomeRideActions() {
  const items = [
    { icon: "🛺", label: "Auto Ride", query: "auto ride" },
    { icon: "🏍️", label: "Bike Ride", query: "bike ride" },
    { icon: "🚗", label: "Car Ride", query: "car ride" },
  ];
  return (
    <section aria-label="Ride services" className="mx-auto mt-3 grid max-w-[1400px] grid-cols-3 gap-2 px-3 sm:gap-4 sm:px-4 md:px-6">
      {items.map((item, index) => (
        <Link
          key={item.label}
          href={`/service?search=${encodeURIComponent(item.query)}`}
          className={`relative flex min-h-20 flex-col items-center justify-center rounded-2xl font-bold text-slate-800 ${index === 0 ? "bg-orange-50" : index === 1 ? "bg-emerald-50" : "bg-blue-50"}`}
        >
          <span className="absolute right-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[8px] font-black text-white">SOON</span>
          <span className="text-2xl">{item.icon}</span>
          <span className="mt-1 text-xs sm:text-sm">{item.label}</span>
        </Link>
      ))}
    </section>
  );
}