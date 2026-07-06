"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Heart, MapPin, Share2, User } from "lucide-react";
import { classifiedApi, type ClassifiedAd } from "@/lib/api/classified";
import {
  classifiedShareUrl,
  formatClassifiedInr,
  formatClassifiedLongDate,
  whatsAppHref,
} from "@/lib/classified/format";
import { resolveMediaUrl } from "@/lib/media";

const TEAL = "#17a2b8";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
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

  const image = resolveMediaUrl(ad?.image) || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=800&fit=crop";
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
    <div className="mx-auto max-w-3xl px-4 py-4 md:py-6">
      <button
        type="button"
        onClick={() => router.push("/classified")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Ad Details
      </button>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="aspect-[16/10] overflow-hidden bg-gray-100">
          <img src={image} alt={ad.title} className="h-full w-full object-cover" />
        </div>

        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700"
            aria-label="Share ad"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <WhatsAppIcon className="h-5 w-5" />
              Chat on WhatsApp
            </a>
          ) : (
            <div className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-500">
              Seller phone not available
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
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
              {ad.description || "No description provided."}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: TEAL }}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{ad.postedBy || "Vendor"}</p>
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

          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <WhatsAppIcon className="h-5 w-5" />
              Chat on WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
