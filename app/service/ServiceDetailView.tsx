"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Seller } from "./serviceData";
import { commerceApi, type AvailableSlot, type Review } from "@/lib/api/commerce";
import { useAuth } from "@/providers/AuthContext";
import { addServiceWishlist, getServiceWishlist, removeServiceWishlist } from "@/lib/serviceWishlist";

const BLUE = "#89CFF0";

const HIGHLIGHTS = ["Professional & trained experts", "Eco-friendly products used"];
const TRUST = [
  { icon: ShieldCheck, label: "Verified experts", detail: "Background checked" },
  { icon: BadgeCheck, label: "Service guarantee", detail: "Quality assured" },
  { icon: CalendarCheck, label: "Easy scheduling", detail: "Pick your time" },
];

function formatInr(n: number): string {
  return `₹${(Number(n) || 0).toLocaleString("en-IN")}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const today = ymd(new Date());
  const bookingLimit = (() => {
    const value = new Date();
    value.setDate(value.getDate() + 90);
    return ymd(value);
  })();
  const selectedDateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "Choose a date that works for you";

  useEffect(() => {
    setFaved(getServiceWishlist().some((record) => String(record.id) === serviceId));
  }, [serviceId]);

  useEffect(() => {
    commerceApi.getReviews("service", serviceId).then((rows) => setReviews(rows as Review[])).catch(() => setReviews([]));
  }, [serviceId]);

  useEffect(() => {
    if (!date || !vendorId) {
      setSlots([]);
      setSlot("");
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    commerceApi.getAvailableSlots(vendorId, date, serviceId)
      .then((list) => {
        if (cancelled) return;
        const nextSlots = Array.isArray(list) ? list : [];
        setSlots(nextSlots);
        setSlot(nextSlots.find((item) => item.available !== false)?.value ?? "");
      })
      .catch((reason) => {
        if (!cancelled) {
          setSlots([]);
          setSlot("");
          setError(reason instanceof Error ? reason.message : "Unable to load available time slots.");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, vendorId, serviceId]);

  function toggleFav() {
    if (faved) {
      removeServiceWishlist(serviceId);
      setFaved(false);
      return;
    }
    addServiceWishlist({
      id: serviceId,
      title: service.title,
      image: service.image,
      provider: service.provider,
      price: service.price,
      duration: service.duration,
      vendorId,
    });
    setFaved(true);
  }

  function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: service.title, url });
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
    }
  }

  async function book() {
    setError("");
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    if (!vendorId) {
      setError("This service is not linked to a provider yet.");
      return;
    }
    if (!date || !slot) {
      setError("Please select a date and time.");
      return;
    }
    setBooking(true);
    try {
      await commerceApi.createBooking({ vendorId, serviceId, date, slot, totalAmount: String(service.price || 0) });
      router.push("/bookings");
    } catch (bookingError) {
      const msg =
        bookingError && typeof bookingError === "object" && "message" in bookingError
          ? String((bookingError as { message: string }).message)
          : "Could not create booking.";
      setError(msg);
      if (/no longer available|not available/i.test(msg) && date && vendorId) {
        setError("That time was just taken. Pick another slot below.");
        setSlot("");
        setSlotsLoading(true);
        commerceApi
          .getAvailableSlots(vendorId, date, serviceId)
          .then((list) => {
            const nextSlots = Array.isArray(list) ? list : [];
            setSlots(nextSlots);
            setSlot(nextSlots.find((item) => item.available !== false)?.value ?? "");
          })
          .catch(() => {
            setSlots([]);
          })
          .finally(() => setSlotsLoading(false));
      }
    } finally {
      setBooking(false);
    }
  }

  async function submitReview() {
    if (!isLoggedIn) {
      window.dispatchEvent(new Event("p4u-open-auth"));
      return;
    }
    setReviewBusy(true);
    try {
      await commerceApi.createReview({
        targetType: "service",
        targetId: serviceId,
        rating: reviewRating,
        comment: reviewText.trim() || undefined,
      });
      const rows = await commerceApi.getReviews("service", serviceId);
      setReviews(rows as Review[]);
      setReviewOpen(false);
      setReviewText("");
      setReviewRating(5);
    } catch {
      // The button state keeps duplicate submissions from being sent.
    } finally {
      setReviewBusy(false);
    }
  }

  const img = service.image?.trim() || "";
  const availableSlots = slots.filter((item) => item.available !== false);
  const takenSlots = slots.filter((item) => item.available === false);

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#202124]">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <button
          onClick={onBack}
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <ArrowLeft className="h-4 w-4" /> Back to services
        </button>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_70px_rgba(30,64,175,0.08)]">
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
            <section className="border-b border-slate-200/80 p-4 sm:p-6 lg:border-b-0 lg:border-r lg:p-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-slate-100">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={service.title} className="h-full w-full object-cover transition duration-700 hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image available</div>
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  {categoryName ? (
                    <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm backdrop-blur">
                      {categoryName}
                    </span>
                  ) : <span />}
                  <div className="flex gap-2">
                    <button onClick={share} aria-label="Share this service" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:-translate-y-0.5 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                      <Share2 className="h-[18px] w-[18px]" />
                    </button>
                    <button onClick={toggleFav} aria-label={faved ? "Remove from wishlist" : "Add to wishlist"} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                      <Heart className={`h-[18px] w-[18px] ${faved ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-1 pb-1 pt-6 sm:px-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-[-0.025em] text-neutral-950 sm:text-3xl">{service.title}</h1>
                    {service.provider ? <p className="mt-1.5 text-sm text-slate-500">Provided by <span className="font-semibold text-slate-700">{service.provider}</span></p> : null}
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-extrabold text-neutral-950">{formatInr(service.price)}</div>
                    {service.originalPrice && service.originalPrice > service.price ? (
                      <div className="mt-1 flex items-center gap-2 sm:justify-end">
                        <span className="text-sm text-slate-400 line-through">{formatInr(service.originalPrice)}</span>
                        {service.offerPercent && service.offerPercent > 0 ? <span className="text-xs font-bold text-emerald-600">Save {service.offerPercent}%</span> : null}
                      </div>
                    ) : <span className="text-xs font-medium text-slate-400">Total service price</span>}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-slate-700">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {service.rating} <span className="font-normal text-slate-500">({reviews.length} reviews)</span>
                  </span>
                  {service.duration ? <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600"><Clock className="h-4 w-4" /> {service.duration}</span> : null}
                  {service.city || service.distance ? <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600"><MapPin className="h-4 w-4" /> {service.city || service.distance}</span> : null}
                </div>
              </div>
            </section>

            <aside className="bg-gradient-to-b from-white to-[#f8fbff] p-5 sm:p-7 lg:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Book your service</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">Choose a convenient time</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">Select a date and one of the available appointment windows.</p>
              </div>

              <div className="relative pl-11">
                <span className="absolute left-[17px] top-10 h-[calc(100%-54px)] w-px bg-slate-200" />
                <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                  <span className="absolute -left-11 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-200">1</span>
                  <label htmlFor="service-date" className="flex items-center gap-2 text-sm font-bold text-neutral-800"><Calendar className="h-4 w-4 text-blue-600" /> Select date</label>
                  <div className="relative mt-3">
                    <input id="service-date" type="date" min={today} max={bookingLimit} value={date} onChange={(event) => setDate(event.target.value)} onClick={(event) => event.currentTarget.showPicker?.()} className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-neutral-800 outline-none [color-scheme:light] focus:border-blue-500 focus:bg-white" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{selectedDateLabel}</p>
                </div>

                <div className={`relative mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition ${date ? "" : "opacity-60"}`}>
                  <span className={`absolute -left-11 top-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm ${date ? "bg-blue-600 text-white shadow-blue-200" : "border border-slate-200 bg-white text-slate-400"}`}>2</span>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-800"><Clock3 className="h-4 w-4 text-blue-600" /> Select time</span>
                    {slotsLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : date ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{availableSlots.length} available</span> : null}
                  </div>

                  {date && !slotsLoading && slots.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {slots.map((item) => {
                        const full = item.available === false;
                        const active = !full && slot === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            disabled={full}
                            onClick={() => setSlot(item.value)}
                            className={`relative min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                              full
                                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 line-through"
                                : active
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {item.label}
                            {full ? (
                              <span className="ml-1 text-[10px] font-bold uppercase no-underline">Full</span>
                            ) : null}
                            {active ? <Check className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="relative mt-3">
                      <select value={slot} disabled={!date || slotsLoading} onChange={(event) => setSlot(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-500 outline-none disabled:cursor-not-allowed" aria-label="Select booking time">
                        <option value="">{date ? (slotsLoading ? "Loading available times…" : "No slots available") : "Select a date first"}</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  )}
                  {date && !slotsLoading && availableSlots.length === 0 && takenSlots.length > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">All listed times are already booked. Try another date.</p>
                  ) : null}
                </div>
              </div>

              {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

              <button onClick={book} disabled={booking || !date || !slot} className="mt-6 flex h-13 min-h-[52px] w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none">
                {booking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : <>Book now <span className="mx-2 text-blue-200">•</span> Pay {formatInr(advance)} advance</>}
              </button>
              <p className="mt-2.5 text-center text-xs text-slate-500">The remaining amount is payable after service.</p>

              <div className="mt-6 grid grid-cols-3 border-t border-slate-200 pt-5">
                {TRUST.map(({ icon: Icon, label, detail }, index) => (
                  <div key={label} className={`px-2 text-center ${index > 0 ? "border-l border-slate-200" : ""}`}>
                    <Icon className="mx-auto h-5 w-5 text-blue-600" />
                    <p className="mt-2 text-[11px] font-bold leading-tight text-slate-700">{label}</p>
                    <p className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">{detail}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_40px_rgba(32,33,36,0.04)] sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">What’s included</p>
            <h2 className="mt-2 text-xl font-bold text-neutral-950">About this service</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{service.description || "Service details will be shared before your appointment."}</p>
            <ul className="mt-5 space-y-3">
              {HIGHLIGHTS.map((highlight) => (
                <li key={highlight} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></span>
                  {highlight}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_40px_rgba(32,33,36,0.04)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Real experiences</p>
                <h2 className="mt-2 text-xl font-bold text-neutral-950">Customer reviews <span className="text-slate-400">({reviews.length})</span></h2>
              </div>
              <button onClick={() => setReviewOpen((open) => !open)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">Write a review</button>
            </div>

            {reviewOpen ? (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your rating</p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button key={rating} onClick={() => setReviewRating(rating)} aria-label={`${rating} star rating`} className="rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                      <Star className={`h-6 w-6 ${rating <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={3} placeholder="Tell others what you liked about the service…" className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setReviewOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white">Cancel</button>
                  <button onClick={submitReview} disabled={reviewBusy} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{reviewBusy ? "Posting…" : "Post review"}</button>
                </div>
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <div className="mt-6 flex flex-col items-center rounded-2xl bg-slate-50 px-6 py-8 text-center">
                <div className="flex gap-1 text-slate-300">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-5 w-5" />)}</div>
                <p className="mt-3 text-sm font-semibold text-slate-700">No reviews yet</p>
                <p className="mt-1 text-xs text-slate-500">Be the first to share your experience.</p>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {reviews.map((review) => (
                  <li key={String(review.id)} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((rating) => <Star key={rating} className={`h-3.5 w-3.5 ${rating <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>
                    {review.comment ? <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
