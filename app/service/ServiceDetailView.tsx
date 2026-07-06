"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Share2, Heart, Star, Clock, MapPin, Calendar, Clock3,
  ShieldCheck, BadgeCheck, CalendarCheck, CheckCircle2, Loader2,
} from "lucide-react";
import { Seller } from "./serviceData";
import { catalogApi } from "@/lib/api/catalog";
import { commerceApi, type AvailableSlot, type Review } from "@/lib/api/commerce";
import { useAuth } from "@/providers/AuthContext";
import { addServiceWishlist, getServiceWishlist, removeServiceWishlist } from "@/lib/serviceWishlist";

const TEAL = "#009999";

const FALLBACK_SLOTS: AvailableSlot[] = [
  { label: "Morning 9-11 AM", value: "09:00-11:00", available: true },
  { label: "Afternoon 12-3 PM", value: "12:00-15:00", available: true },
  { label: "Evening 4-6 PM", value: "16:00-18:00", available: true },
];

const HIGHLIGHTS = ["Professional & trained experts", "Eco-friendly products used"];
const TRUST = [
  { icon: ShieldCheck, label: "Verified Professional" },
  { icon: BadgeCheck, label: "Service Guarantee" },
  { icon: CalendarCheck, label: "Flexible Scheduling" },
];

function formatInr(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextDays(count: number): { key: string; weekday: string; day: number }[] {
  const out: { key: string; weekday: string; day: number }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({ key: ymd(d), weekday: d.toLocaleDateString("en-US", { weekday: "short" }), day: d.getDate() });
  }
  return out;
}

interface Props {
  service: Seller;
  vendorId: string;
  categoryName?: string;
  onBack: () => void;
}

export default function ServiceDetailView({ service, vendorId, categoryName, onBack }: Props) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const days = useMemo(() => nextDays(7), []);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const [faved, setFaved] = useState(false);

  const serviceId = String(service.id);
  const advance = Math.max(1, Math.round((service.price || 0) * 0.05));

  useEffect(() => { setFaved(getServiceWishlist().some((r) => String(r.id) === serviceId)); }, [serviceId]);

  useEffect(() => {
    commerceApi.getReviews("service", serviceId).then((rows) => setReviews(rows as Review[])).catch(() => setReviews([]));
  }, [serviceId]);

  useEffect(() => {
    if (!date || !vendorId) { setSlots([]); setSlot(""); return; }
    let cancelled = false;
    setSlotsLoading(true);
    commerceApi.getAvailableSlots(vendorId, date, serviceId)
      .then((list) => {
        if (cancelled) return;
        const use = Array.isArray(list) && list.length ? list : FALLBACK_SLOTS;
        setSlots(use);
        const first = use.find((s) => s.available !== false);
        setSlot(first?.value ?? "");
      })
      .catch(() => { if (!cancelled) { setSlots(FALLBACK_SLOTS); setSlot(FALLBACK_SLOTS[0].value); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [date, vendorId, serviceId]);

  function toggleFav() {
    if (faved) { removeServiceWishlist(serviceId); setFaved(false); }
    else {
      addServiceWishlist({ id: serviceId, title: service.title, image: service.image, provider: service.provider, price: service.price, duration: service.duration, vendorId });
      setFaved(true);
    }
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) { void navigator.share({ title: service.title, url }); }
    else if (typeof navigator !== "undefined" && navigator.clipboard) { void navigator.clipboard.writeText(url); }
  }

  async function book() {
    setError("");
    if (!isLoggedIn) { window.dispatchEvent(new Event("p4u-open-auth")); return; }
    if (!vendorId) { setError("This service is not linked to a provider yet."); return; }
    if (!date || !slot) { setError("Please select a date and time."); return; }
    setBooking(true);
    try {
      await commerceApi.createBooking({ vendorId, serviceId, date, slot, totalAmount: String(service.price || 0) });
      router.push("/bookings");
    } catch (e) {
      setError(e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Could not create booking.");
    } finally { setBooking(false); }
  }

  async function submitReview() {
    if (!isLoggedIn) { window.dispatchEvent(new Event("p4u-open-auth")); return; }
    setReviewBusy(true);
    try {
      await commerceApi.createReview({ targetType: "service", targetId: serviceId, rating: reviewRating, comment: reviewText.trim() || undefined });
      const rows = await commerceApi.getReviews("service", serviceId);
      setReviews(rows as Review[]);
      setReviewOpen(false); setReviewText(""); setReviewRating(5);
    } catch { /* surfaced via disabled */ } finally { setReviewBusy(false); }
  }

  const img = service.image?.trim() || "";

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <div className="mx-auto max-w-[1200px] px-4 py-5 md:px-8">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Services
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Image */}
          <div className="relative overflow-hidden rounded-2xl bg-gray-100">
            <div className="relative aspect-[4/3]">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={service.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No image</div>
              )}
              <div className="absolute right-3 top-3 flex gap-2">
                <button onClick={share} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow"><Share2 className="h-4 w-4" /></button>
                <button onClick={toggleFav} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow"><Heart className={`h-4 w-4 ${faved ? "fill-rose-500 text-rose-500" : "text-gray-600"}`} /></button>
              </div>
            </div>
          </div>

          {/* Info + booking */}
          <div>
            {categoryName ? <span className="inline-block rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">{categoryName}</span> : null}
            <h1 className="mt-3 text-3xl font-bold text-gray-900">{service.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-gray-700">{service.rating}</span> ({reviews.length} reviews)</span>
              {service.duration ? <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {service.duration}</span> : null}
              {(service.city || service.distance) ? <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {service.city || service.distance}</span> : null}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">{formatInr(service.price)}</span>
              {service.originalPrice && service.originalPrice > service.price ? <span className="text-lg text-gray-400 line-through">{formatInr(service.originalPrice)}</span> : null}
              {service.offerPercent && service.offerPercent > 0 ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600">{service.offerPercent}% OFF</span> : null}
            </div>

            {/* Date */}
            <div className="mt-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Calendar className="h-4 w-4" /> Select Date</p>
              <div className="flex flex-wrap gap-2">
                {days.map((d) => {
                  const active = date === d.key;
                  return (
                    <button key={d.key} onClick={() => setDate(d.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-transparent text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                      style={active ? { background: TEAL } : undefined}>
                      {d.weekday} {d.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time */}
            <div className="mt-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Clock3 className="h-4 w-4" /> Select Time</p>
              {!date ? (
                <p className="text-sm text-gray-400">Select a date first</p>
              ) : slotsLoading ? (
                <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading slots…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((sl) => {
                    const active = slot === sl.value;
                    const disabled = sl.available === false;
                    return (
                      <button key={sl.value} disabled={disabled} onClick={() => setSlot(sl.value)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${active ? "border-transparent text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                        style={active ? { background: TEAL } : undefined}>
                        {sl.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p> : null}

            <button onClick={book} disabled={booking}
              className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-base font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              style={{ background: TEAL }}>
              {booking ? "Booking…" : `Book Now — ${formatInr(advance)}`}
            </button>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-[#009999]/5 px-2 py-3 text-center">
                  <Icon className="h-5 w-5" style={{ color: TEAL }} />
                  <span className="text-[11px] font-medium text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* About + reviews */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-gray-900">About this service</h2>
            <p className="text-sm leading-relaxed text-gray-600">{service.description || "—"}</p>
            <ul className="mt-4 space-y-2">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Customer Reviews ({reviews.length})</h2>
              <button onClick={() => setReviewOpen((o) => !o)} className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300">Write Review</button>
            </div>

            {reviewOpen && (
              <div className="mb-4 rounded-xl border border-gray-100 p-4">
                <div className="mb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewRating(n)}>
                      <Star className={`h-5 w-5 ${n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} placeholder="Share your experience…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#009999]" />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setReviewOpen(false)} className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-500">Cancel</button>
                  <button onClick={submitReview} disabled={reviewBusy} className="rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: TEAL }}>{reviewBusy ? "Posting…" : "Post"}</button>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No reviews yet. Be the first to review!</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={String(r.id)} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}
                    </div>
                    {r.comment ? <p className="mt-1.5 text-sm text-gray-600">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
