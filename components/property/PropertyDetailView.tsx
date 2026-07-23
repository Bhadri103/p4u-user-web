"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Maximize2,
  MessageCircle,
} from "lucide-react";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";
import { resolveMediaUrl } from "@/lib/media";

const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed";

function imageUrls(property: PropertyRow) {
  const raw = [
    property.image_url,
    property.cover_image,
    property.coverImage,
    ...(Array.isArray(property.images) ? property.images : []),
  ];
  return Array.from(
    new Set(
      raw
        .map((item) => {
          if (item && typeof item === "object") {
            const row = item as { url?: unknown; src?: unknown; imageUrl?: unknown };
            return resolveMediaUrl(String(row.url ?? row.src ?? row.imageUrl ?? ""));
          }
          return resolveMediaUrl(String(item || ""));
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export default function PropertyDetailView({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

  const images = useMemo(() => (property ? imageUrls(property) : []), [property]);

  async function sendInquiry(scheduleVisit = false) {
    const defaultMessage = scheduleVisit
      ? "I would like to schedule a visit for this property on YYYY-MM-DD."
      : "I am interested in this property.";
    const message = window.prompt(
      scheduleVisit ? "Enter your preferred visit date and message:" : "Message to owner:",
      defaultMessage,
    );
    if (!message?.trim()) return;
    setSending(true);
    setError("");
    try {
      await propertiesApi.inquire(id, message.trim());
      window.alert(scheduleVisit ? "Visit request sent" : "Inquiry sent");
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <main className="mx-auto min-h-[55vh] max-w-4xl px-4 py-16 text-center text-slate-500">Loading property...</main>;
  }

  if (!property) {
    return (
      <main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-16">
        <div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">{error || "Property not found"}</div>
        <Link href="/find-home" className="mt-5 inline-flex items-center gap-2 font-semibold text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Back to Find Home
        </Link>
      </main>
    );
  }

  const verified =
    property.is_verified === true ||
    property.verified === true ||
    String(property.verification_status || "").toLowerCase() === "verified";
  const listedBy = String(property.listed_by || property.posted_by_type || "");
  const facts = [
    property.bhk ? { icon: BedDouble, label: `${property.bhk} BHK` } : null,
    property.area_sqft || property.areaSqft
      ? { icon: Maximize2, label: `${property.area_sqft || property.areaSqft} sq.ft.` }
      : null,
    property.property_type ? { icon: Building2, label: String(property.property_type) } : null,
  ].filter(Boolean) as Array<{ icon: typeof BedDouble; label: string }>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-7">
      <Link href="/find-home" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Find Home
      </Link>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="relative">
            {images.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[selectedImage]} alt={property.title} className="h-72 w-full object-cover sm:h-[440px]" />
            ) : (
              <div className="flex h-72 items-center justify-center bg-[#E8F4F8] font-semibold text-teal-700 sm:h-[440px]">Property photo</div>
            )}
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-extrabold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
              {listedBy && <span className="rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-extrabold uppercase text-white">Listed by {listedBy}</span>}
            </div>
            {images.length > 1 && <span className="absolute bottom-4 right-4 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white">{selectedImage + 1} / {images.length}</span>}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, index) => (
                <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`shrink-0 overflow-hidden rounded-xl border-2 ${selectedImage === index ? "border-teal-600" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-16 w-24 object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-teal-700">{property.transaction_type || "Property"}</span>
              {property.status && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">{String(property.status)}</span>}
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">{property.title}</h1>
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-500">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {[property.locality, property.city].filter(Boolean).join(", ") || "Location available on request"}
            </p>
            <p className="mt-5 text-3xl font-black text-teal-700">{money(property.price)}</p>

            {facts.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {facts.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <Icon className="h-5 w-5 text-teal-700" />
                    <span className="text-sm font-extrabold text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            )}

            <section className="mt-7">
              <h2 className="text-lg font-black text-slate-800">About this property</h2>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{property.description || "No description provided."}</p>
            </section>
          </div>
        </article>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-slate-800">Interested in this home?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Send an inquiry to the listing owner or request a convenient visit date.</p>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendInquiry(false)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-extrabold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" /> Contact poster
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendInquiry(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-600 px-5 py-3 font-extrabold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
          >
            <CalendarDays className="h-4 w-4" /> Schedule a visit
          </button>
          <p className="mt-4 text-xs leading-5 text-slate-400">Never transfer money before verifying the property and the person posting it.</p>
        </aside>
      </div>
    </main>
  );
}
