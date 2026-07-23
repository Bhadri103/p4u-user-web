"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";

const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Request failed";

export default function PropertyDetailView({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    propertiesApi.get(id)
      .then((row) => { if (!cancelled) setProperty(row); })
      .catch((requestError) => { if (!cancelled) setError(messageOf(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  if (loading) return <main className="mx-auto min-h-[55vh] max-w-5xl px-4 py-16 text-center text-slate-500">Loading property...</main>;
  if (!property) return <main className="mx-auto min-h-[55vh] max-w-5xl px-4 py-16"><div className="rounded-2xl bg-red-50 p-5 text-red-700">{error || "Property not found"}</div><Link href="/find-home" className="mt-5 inline-block font-bold text-teal-700">Back to Find Home</Link></main>;

  const images = Array.isArray(property.images) ? property.images.map(String).filter(Boolean) : [];
  const hero = String(property.image_url || property.cover_image || images[0] || "");
  return <main className="mx-auto max-w-5xl px-4 py-8"><Link href="/find-home" className="font-bold text-teal-700">← Back to Find Home</Link>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}<article className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">{hero?<img src={hero} alt={property.title} className="h-72 w-full object-cover md:h-[430px]"/>:<div className="flex h-72 items-center justify-center bg-teal-50 font-bold text-teal-700">Property photo</div>}<div className="p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{property.transaction_type || "Property"}</p><h1 className="mt-1 text-3xl font-black text-slate-900">{property.title}</h1><p className="mt-2 text-slate-500">{[property.locality, property.city].filter(Boolean).join(", ")}</p></div><p className="text-3xl font-black text-slate-900">{money(property.price)}</p></div><div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-slate-700">{property.property_type&&<span className="rounded-full bg-slate-100 px-4 py-2">{property.property_type}</span>}{property.bhk&&<span className="rounded-full bg-slate-100 px-4 py-2">{String(property.bhk)} BHK</span>}{property.area_sqft&&<span className="rounded-full bg-slate-100 px-4 py-2">{String(property.area_sqft)} sq ft</span>}</div><p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">{property.description || "No description provided."}</p><button onClick={()=>void inquire()} className="mt-7 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white">Contact owner</button></div></article></main>;
}