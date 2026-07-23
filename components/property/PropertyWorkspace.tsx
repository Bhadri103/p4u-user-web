"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";
import { socialApi } from "@/lib/api/social";
import { resolveMediaUrl } from "@/lib/media";

type Tab = "browse" | "mine" | "messages" | "tools";

const fieldClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500";
const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed";

function coverOf(row: PropertyRow): string {
  const images = Array.isArray(row.images) ? row.images.map(String).filter(Boolean) : [];
  return resolveMediaUrl(String(row.image_url || row.cover_image || images[0] || "")) || "";
}

export default function PropertyWorkspace({
  initialTab = "browse",
  embedPost = false,
}: {
  initialTab?: Tab;
  /** When true, show the post form inline (used by /find-home/post). */
  embedPost?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [items, setItems] = useState<PropertyRow[]>([]);
  const [mine, setMine] = useState<PropertyRow[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [saved, setSaved] = useState<Record<string, unknown>[]>([]);
  const [rent, setRent] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bhk, setBhk] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(embedPost);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await propertiesApi.list({
        q: q || undefined,
        type: type || undefined,
        propertyType: propertyType || undefined,
        limit: 100,
      });
      const filtered = (result.items || []).filter((row) => {
        const price = Number(row.price || 0);
        const verified = row.is_verified === true || row.verified === true || String(row.verification_status || "").toLowerCase() === "verified";
        const listedBy = String(row.listed_by || row.posted_by_type || "").toLowerCase();
        if (minPrice && price < Number(minPrice)) return false;
        if (maxPrice && price > Number(maxPrice)) return false;
        if (bhk && String(row.bhk || "") !== bhk) return false;
        if (verifiedOnly && !verified) return false;
        if (ownerOnly && listedBy && listedBy !== "owner") return false;
        return true;
      });
      filtered.sort((a, b) => {
        if (sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
        if (sort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
        if (sort === "newest") return String(b.created_at || b.createdAt || "").localeCompare(String(a.created_at || a.createdAt || ""));
        return 0;
      });
      setItems(filtered);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [q, type, propertyType, bhk, minPrice, maxPrice, verifiedOnly, ownerOnly, sort]);

  const loadAccount = useCallback(async () => {
    const [myRows, messageRows, savedRows, rentRows] = await Promise.all([
      propertiesApi.mine(),
      propertiesApi.messages(),
      propertiesApi.savedSearches(),
      propertiesApi.rentTrackers(),
    ]);
    setMine(myRows || []);
    setMessages(messageRows || []);
    setSaved(savedRows || []);
    setRent(rentRows || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBrowse(), 200);
    return () => window.clearTimeout(timer);
  }, [loadBrowse]);

  useEffect(() => {
    void loadAccount().catch((requestError) => setError(messageOf(requestError)));
  }, [loadAccount]);
  async function saveCurrentSearch() {
    try {
      await propertiesApi.saveSearch({
        name: q || `${type || "All"} properties`,
        query: { q, type, propertyType, bhk, minPrice, maxPrice, verifiedOnly, ownerOnly, sort },
        notify: true,
      });
      setSaved(await propertiesApi.savedSearches());
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Find Home</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-700 sm:text-[28px]">
            Property marketplace
          </h1>
          <p className="mt-1 text-sm text-slate-500">Browse, list and manage verified homes.</p>
        </div>
        {!embedPost ? (
          <div className="flex gap-2">
            <Link
              href="/find-home/post"
              className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Post property
            </Link>
          </div>
        ) : null}
      </div>

      {!embedPost ? (
        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
          {(
            [
              ["browse", "Browse"],
              ["mine", "My properties"],
              ["messages", "Messages"],
              ["tools", "Tools"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap ${
                tab === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {embedPost || showPost ? (
        <PropertyForm
          asPage={embedPost}
          onClose={() => {
            if (embedPost) window.location.assign("/find-home");
            else setShowPost(false);
          }}
          onSaved={async () => {
            if (embedPost) window.location.assign("/find-home");
            else {
              setShowPost(false);
              setTab("mine");
              await loadAccount();
            }
          }}
          setError={setError}
        />
      ) : null}

      {!embedPost && tab === "browse" ? (
        <Browse
          items={items}
          loading={loading}
          q={q}
          setQ={setQ}
          type={type}
          setType={setType}
          propertyType={propertyType}
          setPropertyType={setPropertyType}
          bhk={bhk}
          setBhk={setBhk}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={setVerifiedOnly}
          ownerOnly={ownerOnly}
          setOwnerOnly={setOwnerOnly}
          sort={sort}
          setSort={setSort}
          search={loadBrowse}
          saveSearch={saveCurrentSearch}
        />
      ) : null}
      {!embedPost && tab === "mine" ? (
        <MyListings rows={mine} refresh={loadAccount} setError={setError} />
      ) : null}
      {!embedPost && tab === "messages" ? <Messages rows={messages} /> : null}
      {!embedPost && tab === "tools" ? (
        <Tools saved={saved} rent={rent} refresh={loadAccount} setError={setError} />
      ) : null}
    </main>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
        active
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-white text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {active ? `✓ ${label}` : label}
    </button>
  );
}

function Browse({
  items,
  loading,
  q,
  setQ,
  type,
  setType,
  propertyType,
  setPropertyType,
  bhk,
  setBhk,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  verifiedOnly,
  setVerifiedOnly,
  ownerOnly,
  setOwnerOnly,
  sort,
  setSort,
  search,
  saveSearch,
}: {
  items: PropertyRow[];
  loading: boolean;
  q: string;
  setQ: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  propertyType: string;
  setPropertyType: (value: string) => void;
  bhk: string;
  setBhk: (value: string) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  ownerOnly: boolean;
  setOwnerOnly: (value: boolean) => void;
  sort: string;
  setSort: (value: string) => void;
  search: () => Promise<void>;
  saveSearch: () => Promise<void>;
}) {
  const activeFilters = [
    bhk,
    minPrice,
    maxPrice,
    verifiedOnly ? "verified" : "",
    ownerOnly ? "owner" : "",
  ].filter(Boolean).length;

  return (
    <section className="mt-5">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-teal-500 p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-100">Search smarter</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Find the right home, without the guesswork</h2>
        <p className="mt-2 max-w-2xl text-sm text-teal-50">Filter verified owner and broker listings, compare key details and contact the poster directly.</p>

        <div className="mt-5 inline-flex rounded-xl bg-white/15 p-1">
          {[
            ["", "All"],
            ["sale", "Buy"],
            ["rent", "Rent"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setType(value)}
              className={`rounded-lg px-5 py-2 text-sm font-extrabold transition ${
                type === value ? "bg-white text-teal-800 shadow-sm" : "text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl bg-white p-2 shadow-lg">
          <input
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
            placeholder="Search city, locality, landmark or property"
          />
          <button
            type="button"
            onClick={() => void search()}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700"
          >
            Search
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            ["", "All types"],
            ["Apartment", "Apartment"],
            ["House", "House / Villa"],
            ["Plot", "Plot"],
            ["Commercial", "Commercial"],
          ].map(([value, label]) => (
            <Chip
              key={label}
              active={propertyType === value}
              label={label}
              onClick={() => setPropertyType(value)}
            />
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-500">
            Bedrooms
            <select value={bhk} onChange={(event) => setBhk(event.target.value)} className={`${fieldClass} mt-1 w-full`}>
              <option value="">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Minimum price
            <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" className={`${fieldClass} mt-1 w-full`} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Maximum price
            <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" className={`${fieldClass} mt-1 w-full`} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value)} className={`${fieldClass} mt-1 w-full`}>
              <option value="recommended">Recommended</option>
              <option value="newest">Newest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold ${
            verifiedOnly ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"
          }`}>
            <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="accent-teal-600" />
            Verified only
          </label>
          <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold ${
            ownerOnly ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"
          }`}>
            <input type="checkbox" checked={ownerOnly} onChange={(event) => setOwnerOnly(event.target.checked)} className="accent-teal-600" />
            Listed by owner
          </label>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => {
                setBhk("");
                setMinPrice("");
                setMaxPrice("");
                setVerifiedOnly(false);
                setOwnerOnly(false);
              }}
              className="text-sm font-bold text-slate-500 hover:text-teal-700"
            >
              Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
            </button>
          )}
          <button type="button" onClick={() => void saveSearch()} className="ml-auto text-sm font-extrabold text-teal-700 hover:underline">
            Save search and alerts
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Properties for you</h2>
          <p className="text-sm text-slate-500">{loading ? "Updating results..." : `${items.length} matching properties`}</p>
        </div>
        <Link href="/find-home/post" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700">
          Post property
        </Link>
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-500">Loading properties...</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((row) => <PropertyCard key={row.id} row={row} />)}
        </div>
      )}
      {!loading && !items.length && (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="font-bold text-slate-700">No approved properties match your search.</p>
          <p className="mt-1 text-sm text-slate-500">Try a nearby locality or clear some filters.</p>
        </div>
      )}
    </section>
  );
}
function PropertyCard({ row }: { row: PropertyRow }) {
  const cover = coverOf(row);
  const bhk = row.bhk != null && String(row.bhk) !== "0" ? `${row.bhk} BHK` : "";
  const area = row.area_sqft || row.areaSqft || row.area;
  const place = [row.locality, row.city].filter(Boolean).join(", ");
  const verified =
    row.is_verified === true ||
    row.verified === true ||
    String(row.verification_status || "").toLowerCase() === "verified";
  const listedBy = String(row.listed_by || row.posted_by_type || "");
  const imageCount = Array.isArray(row.images) ? row.images.length : 0;

  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/find-home/${encodeURIComponent(row.id)}`} className="relative block">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={row.title} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-[#E8F4F8] text-sm font-semibold text-teal-700">
            Property photo
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {verified && <span className="rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-extrabold text-white">✓ VERIFIED</span>}
          {listedBy && <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white">{listedBy}</span>}
        </div>
        {imageCount > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-white">{imageCount} photos</span>}
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-base font-black text-slate-800">{row.title}</h2>
          <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-teal-700">
            {row.transaction_type || "sale"}
          </span>
        </div>
        <p className="mt-3 text-lg font-black text-teal-700">{money(row.price)}</p>
        {place && <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold text-slate-500">{place}</p>}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-y border-slate-100 py-3 text-xs font-bold text-slate-600">
          {bhk && <span>{bhk}</span>}
          {area && <span>{String(area)} sq.ft.</span>}
          {row.property_type && <span>{String(row.property_type)}</span>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/find-home/${encodeURIComponent(row.id)}`}
            className="rounded-xl bg-slate-100 py-2.5 text-center text-sm font-extrabold text-slate-700 hover:bg-slate-200"
          >
            View details
          </Link>
          <button
            type="button"
            onClick={() => {
              const text = window.prompt("Message to owner:", "I am interested in this property");
              if (text?.trim()) {
                void propertiesApi
                  .inquire(row.id, text.trim())
                  .then(() => window.alert("Inquiry sent"))
                  .catch((error) => window.alert(messageOf(error)));
              }
            }}
            className="rounded-xl bg-teal-600 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700"
          >
            Contact
          </button>
        </div>
      </div>
    </article>
  );
}
function MyListings({
  rows,
  refresh,
  setError,
}: {
  rows: PropertyRow[];
  refresh: () => Promise<void>;
  setError: (v: string) => void;
}) {
  async function edit(row: PropertyRow) {
    const title = window.prompt("Property title", row.title);
    if (title == null) return;
    const price = window.prompt("Property price", String(row.price || ""));
    if (price == null) return;
    try {
      await propertiesApi.update(row.id, { title: title.trim(), price: Number(price) });
      await refresh();
    } catch (error) {
      setError(messageOf(error));
    }
  }
  return (
    <section className="mt-5 space-y-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
        >
          <div>
            <h2 className="font-semibold text-slate-700">{row.title}</h2>
            <p className="text-sm text-slate-500">
              {money(row.price)} · {row.locality || row.city || "No location"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
              {row.status}
            </span>
            {["pending", "rejected"].includes(String(row.status || "")) ? (
              <button
                type="button"
                onClick={() => void edit(row)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-teal-700"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Delete this property?")) return;
                try {
                  await propertiesApi.remove(row.id);
                  await refresh();
                } catch (error) {
                  setError(messageOf(error));
                }
              }}
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
      {!rows.length ? (
        <p className="py-16 text-center text-slate-500">You have not posted a property.</p>
      ) : null}
    </section>
  );
}

function Messages({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <section className="mt-5 space-y-3">
      {rows.map((row, index) => (
        <article
          key={String(row.id || index)}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
        >
          <div className="flex justify-between gap-3">
            <h2 className="font-semibold text-slate-700">Property inquiry</h2>
            <span className="text-xs font-semibold uppercase text-teal-700">
              {String(row.status || "open")}
            </span>
          </div>
          <p className="mt-2 text-slate-600">{String(row.message || "")}</p>
          <p className="mt-2 text-xs text-slate-400">
            {row.created_at ? new Date(String(row.created_at)).toLocaleString() : ""}
          </p>
        </article>
      ))}
      {!rows.length ? (
        <p className="py-16 text-center text-slate-500">No property conversations yet.</p>
      ) : null}
    </section>
  );
}

function EmiCalculator() {
  const [amount, setAmount] = useState("5000000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("20");
  const principal = Number(amount || 0);
  const monthlyRate = Number(rate || 0) / 1200;
  const months = Number(years || 0) * 12;
  const factor = monthlyRate > 0 && months > 0 ? Math.pow(1 + monthlyRate, months) : 0;
  const emi = factor > 1 ? (principal * monthlyRate * factor) / (factor - 1) : 0;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <h2 className="text-base font-semibold text-slate-700">EMI calculator</h2>
      <div className="mt-4 grid gap-3">
        <input className={fieldClass} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Loan amount" />
        <input className={fieldClass} type="number" min="0" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Interest rate" />
        <input className={fieldClass} type="number" min="1" value={years} onChange={(e) => setYears(e.target.value)} placeholder="Tenure years" />
      </div>
      <div className="mt-4 rounded-xl bg-teal-50 p-4">
        <p className="text-sm text-teal-700">Estimated monthly EMI</p>
        <p className="mt-1 text-xl font-bold text-teal-800">{money(emi)}</p>
      </div>
    </div>
  );
}

function Tools({
  saved,
  rent,
  refresh,
  setError,
}: {
  saved: Record<string, unknown>[];
  rent: Record<string, unknown>[];
  refresh: () => Promise<void>;
  setError: (v: string) => void;
}) {
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [estimate, setEstimate] = useState<{
    low: number;
    average: number;
    high: number;
    sampleSize: number;
  } | null>(null);
  const [propertyName, setPropertyName] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <EmiCalculator />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            setEstimate(await propertiesApi.estimate({ city, propertyType }));
          } catch (error) {
            setError(messageOf(error));
          }
        }}
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
      >
        <h2 className="text-base font-semibold text-slate-700">Property value estimator</h2>
        <div className="mt-4 grid gap-3">
          <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <select className={fieldClass} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option>Apartment</option>
            <option>House</option>
            <option>Plot</option>
            <option>Commercial</option>
          </select>
          <button type="submit" className="rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white">
            Estimate value
          </button>
        </div>
        {estimate ? (
          <div className="mt-4 rounded-xl bg-teal-50 p-4">
            <p className="text-sm text-teal-700">Based on {estimate.sampleSize} approved properties</p>
            <p className="mt-2 text-xl font-bold text-teal-800">{money(estimate.average)}</p>
            <p className="text-sm text-slate-600">
              Range {money(estimate.low)} – {money(estimate.high)}
            </p>
          </div>
        ) : null}
      </form>
      <form
        onSubmit={async (event: FormEvent) => {
          event.preventDefault();
          try {
            await propertiesApi.saveRent({
              propertyName,
              monthlyRent: Number(monthlyRent),
              paidMonths: [],
            });
            setPropertyName("");
            setMonthlyRent("");
            await refresh();
          } catch (error) {
            setError(messageOf(error));
          }
        }}
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
      >
        <h2 className="text-base font-semibold text-slate-700">Rent tracker</h2>
        <div className="mt-4 grid gap-3">
          <input className={fieldClass} value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="Property name" />
          <input className={fieldClass} type="number" min="1" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="Monthly rent" />
          <button type="submit" className="rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white">
            Add tracker
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {rent.map((row, index) => (
            <div key={String(row.id || index)} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm">
              <b className="font-semibold text-slate-700">{String(row.property_name || "Property")}</b>
              <span className="text-slate-500">{money(row.monthly_rent)}/month</span>
            </div>
          ))}
        </div>
      </form>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-700">Saved searches</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {saved.map((row, index) => (
            <div key={String(row.id || index)} className="rounded-xl bg-slate-50 p-3">
              <b className="font-semibold text-slate-700">{String(row.name || "Property search")}</b>
              <p className="text-xs text-slate-500">Notifications {row.notify ? "enabled" : "disabled"}</p>
            </div>
          ))}
        </div>
        {!saved.length ? <p className="mt-3 text-sm text-slate-500">No saved searches yet.</p> : null}
      </div>
    </section>
  );
}

export function PropertyForm({
  onClose,
  onSaved,
  setError,
  asPage = false,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
  setError: (v: string) => void;
  asPage?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    price: "",
    city: "",
    locality: "",
    listingType: "sale",
    propertyType: "Apartment",
    description: "",
    bhk: "",
    areaSqft: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPG or PNG photo.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const uploaded = await socialApi.uploadMedia(file);
      setImageUrl(uploaded.url);
    } catch (error) {
      setPreview("");
      setImageUrl("");
      setError(messageOf(error));
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!imageUrl) {
      setError("Please upload a property photo.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await propertiesApi.create({
        title: form.title,
        price: Number(form.price),
        city: form.city,
        locality: form.locality,
        transaction_type: form.listingType,
        property_type: form.propertyType,
        description: form.description,
        bhk: Number(form.bhk || 0),
        area_sqft: Number(form.areaSqft || 0),
        posted_by: "Owner",
        images: [imageUrl],
      });
      await onSaved();
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={asPage ? "mt-6" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"}
      onMouseDown={asPage ? undefined : onClose}
    >
      <form
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 ${asPage ? "" : "shadow-xl"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-700">Post a property</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input required minLength={5} className={`${fieldClass} md:col-span-2`} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Property title" />
          <input required type="number" min="1" className={fieldClass} value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="Price" />
          <select className={fieldClass} value={form.listingType} onChange={(e) => update("listingType", e.target.value)}>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
          <input className={fieldClass} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="City" />
          <input className={fieldClass} value={form.locality} onChange={(e) => update("locality", e.target.value)} placeholder="Locality" />
          <select className={fieldClass} value={form.propertyType} onChange={(e) => update("propertyType", e.target.value)}>
            <option>Apartment</option>
            <option>House</option>
            <option>Plot</option>
            <option>Commercial</option>
          </select>
          <input type="number" className={fieldClass} value={form.bhk} onChange={(e) => update("bhk", e.target.value)} placeholder="BHK" />
          <input type="number" className={fieldClass} value={form.areaSqft} onChange={(e) => update("areaSqft", e.target.value)} placeholder="Area (sq ft)" />

          <div className="md:col-span-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-44 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-[#E8F4F8] text-sm font-semibold text-teal-700 disabled:opacity-60"
            >
              {uploading ? (
                "Uploading..."
              ) : preview || imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview || resolveMediaUrl(imageUrl) || ""}
                  alt="Property preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <span>Upload property photo</span>
                  <span className="mt-1 text-xs font-medium text-slate-500">JPG or PNG</span>
                </>
              )}
            </button>
            {(preview || imageUrl) && !uploading ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-sm font-semibold text-teal-700 hover:underline"
              >
                Change photo
              </button>
            ) : null}
          </div>

          <textarea
            rows={4}
            className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-teal-500 md:col-span-2"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Description"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
