"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Leaf,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { foodApi, type FoodRestaurant } from "@/lib/api/food";

function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message)
    : "Unable to load restaurants";
}

function money(value: string | number | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function FoodBrowseView() {
  const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [fastOnly, setFastOnly] = useState(false);
  const [ratedOnly, setRatedOnly] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      foodApi
        .listRestaurants({
          search: search.trim() || undefined,
          cuisine: cuisine || undefined,
          vegOnly,
        })
        .then((rows) => {
          setRestaurants(rows);
          setCuisineOptions((current) =>
            Array.from(
              new Set([
                ...current,
                ...rows.flatMap((restaurant) => restaurant.cuisine || []),
              ]),
            )
              .filter(Boolean)
              .slice(0, 16),
          );
        })
        .catch((requestError) => setError(messageOf(requestError)))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, cuisine, vegOnly]);

  const visibleRestaurants = useMemo(() => {
    const rows = restaurants.filter((restaurant) => {
      if (fastOnly && Number(restaurant.avgPrepMinutes || 0) > 30) return false;
      if (ratedOnly && Number(restaurant.rating || 0) < 4) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === "rating") return Number(b.rating) - Number(a.rating);
      if (sort === "time") return Number(a.avgPrepMinutes) - Number(b.avgPrepMinutes);
      if (sort === "distance") return Number(a.distanceKm ?? Number.MAX_VALUE) - Number(b.distanceKm ?? Number.MAX_VALUE);
      return 0;
    });
  }, [restaurants, fastOnly, ratedOnly, sort]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Delivering near</p>
            <p className="truncate text-sm font-bold text-slate-800">Your selected location</p>
          </div>
        </div>
        <p className="hidden text-xs font-semibold text-teal-700 sm:block">Change it from the location selector above</p>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#087f7f] via-[#0a9a9a] to-[#16b8a9] px-6 py-8 text-white md:px-10 md:py-11">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-52 w-52 rounded-full bg-amber-300/15" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-100">Planext4u Food</p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">Cravings delivered, your way</h1>
          <p className="mt-3 max-w-xl text-sm text-teal-50 md:text-base">
            Discover live menus, customise every dish, apply offers and track your order from kitchen to doorstep.
          </p>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-gray-700 shadow-lg">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              className="w-full bg-transparent outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search restaurants, dishes or cuisine"
            />
          </label>
        </div>
      </section>

      {cuisineOptions.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xl font-black text-slate-900">What are you craving?</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterButton active={!cuisine} onClick={() => setCuisine("")}>All cuisines</FilterButton>
            {cuisineOptions.map((value) => (
              <FilterButton key={value} active={cuisine === value} onClick={() => setCuisine(value)}>
                {value}
              </FilterButton>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterButton active={fastOnly} onClick={() => setFastOnly((value) => !value)}>
          <Clock3 className="h-4 w-4" /> Fast delivery
        </FilterButton>
        <FilterButton active={ratedOnly} onClick={() => setRatedOnly((value) => !value)}>
          <Star className="h-4 w-4" /> Rating 4.0+
        </FilterButton>
        <FilterButton active={vegOnly} onClick={() => setVegOnly((value) => !value)}>
          <Leaf className="h-4 w-4" /> Pure veg
        </FilterButton>
        <label className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
          <SlidersHorizontal className="h-4 w-4" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
            <option value="recommended">Recommended</option>
            <option value="rating">Top rated</option>
            <option value="time">Delivery time</option>
            <option value="distance">Distance</option>
          </select>
        </label>
      </section>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Restaurants near you</h2>
          <p className="text-sm text-gray-500">{loading ? "Finding kitchens..." : `${visibleRestaurants.length} available`}</p>
        </div>
        <Link href="/food/orders" className="inline-flex items-center gap-1 text-sm font-bold text-[#087f7f] hover:underline">
          My orders <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#0a9a9a]" /></div>}
      {!loading && error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>}
      {!loading && !error && visibleRestaurants.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-bold text-gray-700">No restaurants match these filters</p>
          <button type="button" onClick={() => { setCuisine(""); setFastOnly(false); setRatedOnly(false); setVegOnly(false); }} className="mt-3 text-sm font-bold text-teal-700">
            Clear filters
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleRestaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/food/${restaurant.id}`}
            className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative h-48 bg-gradient-to-br from-orange-100 to-amber-50">
              {restaurant.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.coverImage} alt={restaurant.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
              ) : (
                <UtensilsCrossed className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-orange-300" />
              )}
              <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                restaurant.status === "open" ? "bg-green-600 text-white" : restaurant.status === "busy" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"
              }`}>{restaurant.status}</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-gray-900 group-hover:text-[#087f7f]">{restaurant.name}</h3>
                  <p className="mt-1 line-clamp-1 text-sm text-gray-500">{restaurant.cuisine?.join(" • ") || restaurant.tagline || "Freshly prepared"}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-extrabold text-white">
                  <Star className="h-3 w-3 fill-current" />{Number(restaurant.rating).toFixed(1)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />{restaurant.avgPrepMinutes} min</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{restaurant.distanceKm != null ? `${Number(restaurant.distanceKm).toFixed(1)} km` : restaurant.address}</span>
              </div>
              {Number(restaurant.minOrderAmount || 0) > 0 && (
                <p className="mt-3 border-t border-dashed pt-3 text-xs font-bold text-teal-700">Minimum order {money(restaurant.minOrderAmount)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-teal-600 bg-teal-50 text-teal-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
      }`}
    >
      {children}
    </button>
  );
}
