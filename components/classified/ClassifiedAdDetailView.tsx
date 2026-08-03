"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Flag, Heart, MapPin, MessageCircle, Phone, Share2, User } from "lucide-react";
import { classifiedApi, type ClassifiedAd } from "@/lib/api/classified";
import {
  classifiedShareUrl,
  formatClassifiedInr,
  formatClassifiedLongDate,
  whatsAppHref,
} from "@/lib/classified/format";
import { resolveMediaUrl } from "@/lib/media";

const TEAL = "#89CFF0";

function parseClassifiedDescription(value: string | null) {
  const lines = (value || "").split(/\r?\n/);
  const marker = lines.findIndex((line) => line.trim().toLowerCase() === "listing details");
  const summary = (marker >= 0 ? lines.slice(0, marker) : lines).join("\n").trim();
  const details: Record<string, string> = {};
  (marker >= 0 ? lines.slice(marker + 1) : []).forEach((line) => {
    const index = line.indexOf(":");
    if (index > 0) details[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  });
  return { summary, details };
}

function DetailSection({ title, rows }: { title: string; rows: Array<[string, string | number | boolean | null | undefined]> }) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!visible.length) return null;
  return <div className="rounded-2xl border border-gray-200 p-4"><h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2><div className="grid gap-3 sm:grid-cols-2">{visible.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold capitalize text-neutral-900">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value).replaceAll("_", " ")}</p></div>)}</div></div>;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ClassifiedAdDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [ad, setAd] = useState<ClassifiedAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setSelectedImage(null);
      try {
        const row = await classifiedApi.get(id);
        if (!cancelled) setAd(row);
      } catch (e: unknown) {
        if (!cancelled) {
          setAd(null);
          setError(e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Ad not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const image = resolveMediaUrl(selectedImage || ad?.image) || "";
  const parsed = parseClassifiedDescription(ad?.description ?? null);
  const waHref = useMemo(() => {
    if (!ad) return null;
    const msg = `Hi, I'm interested in your classified ad "${ad.title}" on Planext4U.`;
    return whatsAppHref(ad.contactPhone, msg);
  }, [ad]);

  async function handleShare() {
    const url = classifiedShareUrl(id);
    try {
      if (navigator.share) {
        await navigator.share({ title: ad?.title || "Classified Ad", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard");
    } catch {
      /* user cancelled share */
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-[520px] animate-pulse rounded-2xl bg-gray-100" /></div>;
  }

  if (!ad) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-lg font-semibold text-gray-800">{error || "Ad not found"}</p>
        <button type="button" onClick={() => router.push("/classified")} className="mt-4 text-sm font-medium" style={{ color: TEAL }}>
          Back to Classifieds
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-4 py-5 md:py-8">
      <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() => router.push("/classified")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Ad Details
      </button>

      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_18px_60px_rgba(32,33,36,0.08)]">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="bg-slate-50/70 p-3 sm:p-4">
        <div className="aspect-[4/3] max-h-[520px] overflow-hidden rounded-2xl bg-gray-100">
          {image ? <img src={image} alt={ad.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Image unavailable</div>}
        </div>
        {ad.images.length > 1 ? <div className="flex gap-2 overflow-x-auto py-2.5">{ad.images.slice(0, 10).map((url,index) => <button key={`${url}-${index}`} type="button" onClick={() => setSelectedImage(url)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-0.5 ${resolveMediaUrl(url) === image ? "border-blue-500" : "border-transparent hover:border-blue-200"}`} aria-label={`View photo ${index + 1}`}><img src={resolveMediaUrl(url) || url} alt={`Photo ${index + 1}`} className="h-full w-full rounded-lg object-cover"/></button>)}</div> : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => setSaved((value) => !value)} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${saved ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 text-gray-700"}`}><Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`}/>Save</button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700"
            aria-label="Share ad"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => alert("Thanks. This ad was reported.")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-gray-700"><Flag className="h-3.5 w-3.5"/>Report</button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          ) : (
            <div className="flex h-9 flex-1 items-center justify-center rounded-lg bg-gray-100 px-3 text-xs text-gray-500">
              Seller phone not available
            </div>
          )}
        </div>
        </div>

        <div className="space-y-5 border-t border-gray-100 p-5 lg:border-l lg:border-t-0 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{ad.title}</h1>
              <p className="mt-2 text-2xl font-bold" style={{ color: TEAL }}>{formatClassifiedInr(ad.price)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSaved((v) => !v)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${saved ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 text-gray-500"}`}
              aria-label="Save ad"
            >
              <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {ad.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {ad.location}
              </span>
            ) : null}
            {ad.createdAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatClassifiedLongDate(ad.createdAt)}
              </span>
            ) : null}
            {ad.categoryName ? (
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                {ad.categoryName}
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
              {parsed.summary || "No description provided."}
            </p>
          </div>

          <DetailSection title="Product details" rows={[
            ["Ad type", ad.adType || parsed.details["ad type"]], ["Condition", ad.condition || parsed.details.condition], ["Brand", ad.brand || parsed.details.brand], ["Model", ad.model || parsed.details.model], ["Manufacture year", ad.manufactureYear || parsed.details.year], ["Quantity", ad.quantity || parsed.details.quantity], ["Keywords", ad.tags?.join(", ") || parsed.details.keywords],
          ]}/>
          <DetailSection title="Price and availability" rows={[
            ["Price negotiable", ad.negotiable ?? parsed.details.negotiable], ["Warranty", ad.warranty ?? parsed.details.warranty], ["Original invoice", ad.invoiceAvailable ?? parsed.details["invoice available"]], ["Delivery / shipping", ad.deliveryAvailable ?? parsed.details["delivery available"]],
          ]}/>
          <DetailSection title="Listing location" rows={[
            ["State", ad.state || parsed.details.state], ["City", ad.city || parsed.details.city], ["Locality / area", ad.area || parsed.details["locality / area"]], ["PIN code", ad.pincode || parsed.details["pin code"]],
          ]}/>
          <DetailSection title="About this ad" rows={[["Ad ID", ad.id], ["Posted on", ad.createdAt ? formatClassifiedLongDate(ad.createdAt) : ""], ["Status", ad.status || "Approved"]]}/>

          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: TEAL }}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{ad.sellerName || parsed.details["seller name"] || ad.postedBy || "Seller"}</p>
                {ad.contactPhone ? <p className="text-sm text-gray-500">{ad.contactPhone}</p> : null}
                {(ad.preferredContact || parsed.details["preferred contact"]) ? <p className="text-xs capitalize text-gray-500">Preferred: {(ad.preferredContact || parsed.details["preferred contact"])?.replaceAll("_", " ")}</p> : null}
                <p className="text-sm text-gray-500">Member since {ad.memberSince || "2024"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-900">
            <p className="font-semibold">⚠️ Safety Tips</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-orange-800">
              <li>Meet in a public place for transactions</li>
              <li>Don&apos;t send money in advance</li>
              <li>Inspect the item before paying</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3"><a href={waHref || "#"} onClick={(e) => { if (!waHref) { e.preventDefault(); alert("Seller contact is not available."); } }} target={waHref ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3.5 text-sm font-semibold text-neutral-800"><MessageCircle className="h-5 w-5"/>Chat</a><a href={ad.contactPhone ? `tel:${ad.contactPhone}` : "#"} onClick={(e) => { if (!ad.contactPhone) { e.preventDefault(); alert("Seller contact is not available."); } }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#89CFF0] px-4 py-3.5 text-sm font-semibold text-white"><Phone className="h-5 w-5"/>Call seller</a></div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
