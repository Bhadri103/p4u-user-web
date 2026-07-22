"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";
import { resolveMediaUrl } from "@/lib/media";

const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed";

export default function PropertyDetailView({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    propertiesApi
      .get(id)
      .then((row) => {
        if (!cancelled) setProperty(row);
      })
      .catch((requestError) => {
        if (!cancelled) setError(messageOf(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function inquire() {
    const message = window.prompt("Message to owner:", "I am interested in this property");
    if (!message?.trim()) return;
    try {
      await propertiesApi.inquire(id, message.trim());
      window.alert("Inquiry sent");
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-16 text-center text-slate-500">
        Loading property...
      </main>
    );
  }
  if (!property) {
    return (
      <main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-16">
        <div className="rounded-2xl bg-red-50 p-5 text-red-700">{error || "Property not found"}</div>
        <Link href="/find-home" className="mt-5 inline-block font-semibold text-teal-700">
          Back to Find Home
        </Link>
      </main>
    );
  }

  const images = Array.isArray(property.images) ? property.images.map(String).filter(Boolean) : [];
  const hero = resolveMediaUrl(
    String(property.image_url || property.cover_image || images[0] || ""),
  ) || "";
  const metaBits = [
    property.bhk != null && String(property.bhk) !== "0" ? `${property.bhk} BHK` : "",
    property.property_type,
    property.area_sqft ? `${property.area_sqft} sq ft` : "",
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/find-home" className="text-sm font-semibold text-teal-700 hover:underline">
        ← Back to Find Home
      </Link>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <article className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={property.title} className="h-72 w-full object-cover md:h-[400px]" />
        ) : (
          <div className="flex h-72 items-center justify-center bg-[#E8F4F8] font-semibold text-teal-700">
            Property photo
          </div>
        )}
        <div className="p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            {property.transaction_type || "Property"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-700">{property.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {[property.locality, property.city].filter(Boolean).join(", ")}
          </p>
          <p className="mt-4 text-2xl font-bold text-teal-700">{money(property.price)}</p>
          {metaBits.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {metaBits.map((bit) => (
                <span
                  key={String(bit)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600"
                >
                  {bit}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-600">
            {property.description || "No description provided."}
          </p>
          <button
            type="button"
            onClick={() => void inquire()}
            className="mt-7 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Contact owner
          </button>
        </div>
      </article>
    </main>
  );
}
