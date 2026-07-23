"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, Leaf, Loader2, MapPin, Search, Star, UtensilsCrossed } from "lucide-react";
import { foodApi, type FoodRestaurant } from "@/lib/api/food";

function messageOf(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : "Unable to load restaurants";
}

export default function FoodBrowseView() {
  const [restaurants, setRestaurants] = useState<FoodRestaurant[]>([]);
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      foodApi.listRestaurants({ search: search.trim() || undefined, vegOnly })
        .then(setRestaurants)
        .catch((e) => setError(messageOf(e)))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, vegOnly]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#087f7f] to-[#11a6a6] px-6 py-9 text-white md:px-10">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">Planext4u Food</p>
          <h1 className="text-3xl font-bold md:text-5xl">Good food, delivered fresh</h1>
          <p className="mt-3 text-sm text-teal-50 md:text-base">Browse nearby restaurants, order from live menus, and track every kitchen update.</p>
        </div>
        <div className="mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 text-gray-700 shadow-sm">
            <Search className="h-5 w-5 text-gray-400" />
            <input className="w-full bg-transparent outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurants or cuisine" />
          </label>
          <button type="button" onClick={() => setVegOnly((v) => !v)} className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold ${vegOnly ? "bg-green-600 text-white" : "bg-white text-gray-700"}`}>
            <Leaf className="h-4 w-4" /> Veg only
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-3">
        <div><h2 className="text-2xl font-bold text-gray-900">Restaurants</h2><p className="text-sm text-gray-500">{loading ? "Finding kitchens…" : `${restaurants.length} available`}</p></div>
        <Link href="/food/orders" className="text-sm font-semibold text-[#087f7f] hover:underline">My food orders</Link>
      </div>

      {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#0a9a9a]" /></div>}
      {!loading && error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>}
      {!loading && !error && restaurants.length === 0 && (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center"><UtensilsCrossed className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 font-semibold text-gray-700">No restaurants match this search</p></div>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((restaurant) => (
          <Link key={restaurant.id} href={`/food/${restaurant.id}`} className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="relative h-44 bg-gradient-to-br from-orange-100 to-amber-50">
              {restaurant.coverImage ? <img src={restaurant.coverImage} alt="" className="h-full w-full object-cover" /> : <UtensilsCrossed className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-orange-300" />}
              <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${restaurant.status === "open" ? "bg-green-600 text-white" : restaurant.status === "busy" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`}>{restaurant.status}</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-gray-900 group-hover:text-[#087f7f]">{restaurant.name}</h3><p className="mt-1 line-clamp-1 text-sm text-gray-500">{restaurant.cuisine?.join(" • ") || restaurant.tagline || "Freshly prepared"}</p></div><span className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-bold text-white"><Star className="h-3 w-3 fill-current" />{Number(restaurant.rating).toFixed(1)}</span></div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500"><span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />{restaurant.avgPrepMinutes} min</span><span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{restaurant.distanceKm != null ? `${restaurant.distanceKm} km` : restaurant.address}</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
