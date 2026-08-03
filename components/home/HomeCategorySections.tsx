"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogApi, type Category } from "@/lib/api/catalog";
import { resolveMediaUrl } from "@/lib/media";

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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    catalogApi
      .getCategories({ limit: kind === "product" ? 200 : 100, kind })
      .then((result) => {
        if (!cancelled) setRows(orderedRoots((result.data || []) as HomeCategory[]));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);
  return { rows, loading };
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
      <span className="mt-2 block max-w-24 truncate text-xs font-bold text-neutral-800">{category.name}</span>
    </Link>
  );
}

export function HomeCategoryRail() {
  const { rows: categories, loading } = useCategories("product");
  return (
    <section aria-label="Top categories" className="mx-auto mt-6 max-w-7xl bg-white  px-4 sm:px-6 lg:mt-8 lg:px-8">
      <div className="rounded-[24px] border border-[#D7E7F5] bg-white p-5 shadow-[0_14px_40px_rgba(31,74,125,.07)] sm:p-7 lg:rounded-[30px] lg:p-8">
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div><span className="text-xs font-bold uppercase tracking-[0.16em] text-[#89CFF0]">Discover</span><h2 className="mt-1 text-xl font-extrabold tracking-[-0.025em] text-[#202124] sm:text-[28px]">Shop by category</h2><p className="mt-1 text-sm text-slate-500 sm:text-base">Find what you need without the endless search.</p></div>
        <Link href="/shop" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#EAF4FF] px-3.5 py-2 text-xs font-bold text-[#89CFF0] transition hover:bg-[#D8ECFF] sm:text-sm">See all <span aria-hidden>→</span></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {loading ? Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[150px] animate-pulse rounded-2xl bg-slate-100 sm:h-[175px]" aria-hidden />
        )) : categories.length > 0 ? categories.slice(0, 6).map((category) => {
          const image = categoryImage(category);
          return (
          <Link key={category.id} href={`/shop?categoryId=${encodeURIComponent(category.id)}`} className="group relative h-[150px] overflow-hidden rounded-2xl border border-[#DCE8F3] bg-slate-100 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#90CAF9] hover:shadow-[0_14px_28px_rgba(137,207,240,.14)] sm:h-[175px]">
            {image ? <img src={image} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 text-white sm:p-4">
              <strong className="line-clamp-2 text-sm font-extrabold sm:text-base">{category.name}</strong>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#89CFF0] shadow-md transition group-hover:translate-x-1">→</span>
            </span>
          </Link>
          );
        }) : <p className="py-3 text-sm text-slate-500">No categories available right now.</p>}
      </div>
      </div>
    </section>
  );
}

export function HomeCategoryGrid() {
  const { rows: categories } = useCategories("product");
  const trending = useMemo(
    () => categories.filter((row) => row.isTrending === true || row.is_trending === true),
    [categories],
  );
  if (!categories.length) return null;
  return (
    <section className="mx-auto mt-4 max-w-[1400px] px-3 sm:px-4 md:px-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-neutral-900 sm:text-2xl">Shop by Category</h2>
          <Link href="/shop" className="shrink-0 whitespace-nowrap text-sm font-bold text-teal-700">View all</Link>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-10">
          {categories.slice(0, 20).map((category) => <CategoryTile key={category.id} category={category} />)}
        </div>
        {trending.length > 0 && (
          <div className="mt-6 border-t pt-5">
            <h3 className="mb-4 font-black text-neutral-900">🔥 Trending Categories</h3>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {trending.map((category) => <CategoryTile key={category.id} category={category} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function HomeServiceCategories() {
  const { rows: categories } = useCategories("service");
  if (!categories.length) return null;
  return (
    <section className="mx-auto mt-4 max-w-[1400px] px-3 sm:px-4 md:px-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-neutral-900 sm:text-2xl">Services for You</h2>
          <Link href="/service" className="shrink-0 whitespace-nowrap text-sm font-bold text-teal-700">View all</Link>
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
          className={`relative flex min-h-20 flex-col items-center justify-center rounded-2xl font-bold text-neutral-800 ${index === 0 ? "bg-orange-50" : index === 1 ? "bg-emerald-50" : "bg-blue-50"}`}
        >
          <span className="absolute right-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[8px] font-black text-white">SOON</span>
          <span className="text-2xl">{item.icon}</span>
          <span className="mt-1 text-xs sm:text-sm">{item.label}</span>
        </Link>
      ))}
    </section>
  );
}
