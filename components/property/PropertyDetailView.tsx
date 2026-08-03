"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Check,
  ChevronRight,
  Copy,
  Heart,
  Home,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { propertiesApi, type PropertyRow } from "@/lib/api/properties";

const money = (value: unknown) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Request failed";
const readable = (value: unknown) => typeof value === "boolean"
  ? (value ? "Yes" : "No")
  : String(value).replaceAll("_", " ");

const DEMO_PROPERTY_DETAILS: Record<string, PropertyRow> = {
  "demo-home-1": { id:"demo-home-1",title:"Modern 2 BHK Apartment",transaction_type:"sale",property_type:"apartment",bhk:2,bathrooms:2,balconies:1,area_sqft:1180,locality:"Whitefield",city:"Bengaluru",state:"Karnataka",price:7200000,image_url:"/images/properties/modern-apartment.jpg",images:["/images/properties/modern-apartment.jpg"],description:"Bright, thoughtfully furnished apartment with a spacious living area and balcony views.",furnishing:"furnished",parking:"car",ownership:"freehold",availability:"ready",amenities:["lift","security","power_backup","water_supply"],contact_name:"Property Owner",status:"approved" },
  "demo-home-2": { id:"demo-home-2",title:"Premium Family Villa",transaction_type:"sale",property_type:"villa",bhk:4,bathrooms:4,balconies:2,area_sqft:2850,locality:"Kakkanad",city:"Kochi",state:"Kerala",price:14500000,image_url:"/images/properties/family-villa.jpg",images:["/images/properties/family-villa.jpg"],description:"Independent family villa with landscaped surroundings, generous rooms and covered parking.",furnishing:"semi_furnished",parking:"both",ownership:"freehold",availability:"ready",amenities:["security","water_supply","park","pet_friendly"],contact_name:"Property Owner",status:"approved" },
  "demo-home-3": { id:"demo-home-3",title:"Furnished Studio Apartment",transaction_type:"rent",property_type:"apartment",bhk:1,bathrooms:1,balconies:1,area_sqft:540,locality:"HITEC City",city:"Hyderabad",state:"Telangana",price:24000,security_deposit:48000,image_url:"/images/properties/furnished-studio.jpg",images:["/images/properties/furnished-studio.jpg"],description:"Compact furnished studio with a dedicated workspace, storage and excellent natural light.",furnishing:"furnished",parking:"bike",ownership:"freehold",availability:"ready",amenities:["lift","security","internet","air_conditioning"],contact_name:"Property Owner",status:"approved" },
};

type Detail = [string, unknown];

function InfoGrid({ title, icon, values }: { title: string; icon: ReactNode; values: Detail[] }) {
  const rows = values.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!rows.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-neutral-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-700">{icon}</span>
        <h2 className="text-base font-extrabold">{title}</h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 border-b border-slate-100 py-2.5 last:border-0">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold capitalize text-neutral-800" title={readable(value)}>{readable(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-rose-700">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-neutral-900">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function PropertyDetailView({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shortlisted, setShortlisted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "terms">("overview");

  useEffect(() => {
    let cancelled = false;
    const demo = DEMO_PROPERTY_DETAILS[id];
    if (demo) {
      setProperty(demo);
      setLoading(false);
      return;
    }
    propertiesApi.get(id)
      .then((row) => { if (!cancelled) setProperty(row && row.id ? row : null); })
      .catch((requestError) => { if (!cancelled) setError(messageOf(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const gallery = useMemo(() => {
    if (!property) return [];
    const list = [property.image_url, property.cover_image, ...(Array.isArray(property.images) ? property.images : [])]
      .filter((value) => typeof value === "string" && value.trim())
      .map(String);
    return Array.from(new Set(list));
  }, [property]);

  if (loading) return (
    <main className="mx-auto min-h-[55vh] max-w-7xl px-4 py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="aspect-[16/9] rounded-3xl bg-slate-200" />
          <div className="rounded-3xl bg-white p-7"><div className="h-8 w-3/4 rounded bg-slate-200" /></div>
        </div>
      </div>
    </main>
  );

  if (!property) return (
    <main className="mx-auto min-h-[55vh] max-w-5xl px-4 py-16">
      <div className="rounded-2xl bg-red-50 p-5 text-red-700">{error || "Property not found"}</div>
      <Link href="/find-home" className="mt-5 inline-flex items-center gap-2 font-bold text-rose-700"><ArrowLeft size={18} /> Back to Find Home</Link>
    </main>
  );

  const p = property;
  const hero = gallery[activeImage] || "";
  const locality = [p.locality, p.city].filter(Boolean).join(", ");
  const fullLocation = [p.address, p.locality, p.city, p.state, p.pincode].filter(Boolean).join(", ");
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const phone = String(p.contact_phone || p.phone || "");

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: p.title, url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      window.alert("Link copied to clipboard.");
    }
  };

  const inquire = () => {
    const text = window.prompt("Message to owner:", "I am interested in this property");
    if (!text?.trim()) return;
    void propertiesApi.inquire(id, text.trim())
      .then(() => window.alert("Inquiry sent"))
      .catch((requestError) => setError(messageOf(requestError)));
  };

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "details" as const, label: "Property details" },
    { id: "terms" as const, label: "Price & status" },
  ];

  return (
    <main className="bg-[linear-gradient(180deg,#fff_0%,#f8fafc_38%,#f8fafc_100%)] pb-24 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/find-home" className="inline-flex items-center gap-1.5 font-semibold transition hover:text-rose-700"><ArrowLeft size={16} /> Find Home</Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="max-w-[55vw] truncate text-slate-700">{p.title}</span>
        </nav>

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,.55fr)]">
          <section className="group relative overflow-hidden rounded-2xl bg-neutral-900 shadow-[0_20px_50px_-28px_rgba(32,33,36,.65)] sm:rounded-3xl">
            {hero ? (
              <img src={hero} alt={p.title} className="aspect-[16/10] w-full object-cover sm:aspect-[16/9] lg:max-h-[520px]" />
            ) : (
              <div className="grid aspect-[16/10] place-items-center bg-slate-100 text-slate-500"><Home size={36} /><span>No property photos</span></div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-neutral-950/70 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-rose-700 shadow-sm backdrop-blur">
              For {p.transaction_type || "property"}
            </span>
            <button onClick={() => setShortlisted((value) => !value)} aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"} className={`absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full shadow-sm backdrop-blur transition ${shortlisted ? "bg-rose-600 text-white" : "bg-white/90 text-slate-700 hover:text-rose-600"}`}>
              <Heart size={19} fill={shortlisted ? "currentColor" : "none"} />
            </button>
            {gallery.length > 1 && (
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                  {gallery.slice(0, 8).map((src, index) => (
                    <button key={`${src}-${index}`} onClick={() => setActiveImage(index)} aria-label={`View property photo ${index + 1}`} className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${activeImage === index ? "border-white" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      <img src={src} alt="" className="h-11 w-14 object-cover sm:h-14 sm:w-20" />
                    </button>
                  ))}
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-950/65 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur"><Maximize2 size={13} /> {activeImage + 1}/{gallery.length}</span>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(32,33,36,.45)] sm:rounded-3xl sm:p-7 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{p.status || "Available"}</span>
              <button onClick={() => void share()} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200" aria-label="Share property"><Share2 size={17} /></button>
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-neutral-950 sm:text-3xl">{p.title}</h1>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={16} className="mt-0.5 shrink-0 text-rose-600" /> {fullLocation || "Location not provided"}</p>
            <div className="my-5 h-px bg-slate-100" />
            <p className="text-3xl font-black tracking-tight text-neutral-950">{money(p.price)} {p.transaction_type === "rent" && <span className="text-sm font-medium text-slate-500">/ month</span>}</p>
            {p.price_negotiable && <p className="mt-1 text-xs font-semibold text-emerald-700">Price is negotiable</p>}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat icon={<BedDouble size={18} />} value={p.bhk || "—"} label="Bedrooms" />
              <Stat icon={<Bath size={18} />} value={p.bathrooms || "—"} label="Bathrooms" />
              <Stat icon={<Maximize2 size={18} />} value={p.area_sqft ? Number(p.area_sqft).toLocaleString("en-IN") : "—"} label={p.area_unit || "sq ft"} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={inquire} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-50"><MessageCircle size={17} /> Message</button>
              <a href={phone ? `tel:${phone}` : "#"} onClick={(event) => { if (!phone) { event.preventDefault(); window.alert("Owner contact is not available."); } }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-700/20 transition hover:bg-rose-800"><Phone size={17} /> Call owner</a>
            </div>
            <button onClick={() => window.alert("Visit request sent.")} className="mt-3 w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Schedule a visit</button>
          </aside>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_45px_-34px_rgba(32,33,36,.4)] sm:rounded-3xl">
          <div className="flex overflow-x-auto border-b border-slate-100 px-3 sm:px-6 [scrollbar-width:none]" role="tablist" aria-label="Property information">
            {tabs.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`relative shrink-0 px-4 py-4 text-sm font-bold transition ${activeTab === tab.id ? "text-rose-700" : "text-slate-500 hover:text-neutral-800"}`}>
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-rose-700" />}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7 lg:p-8">
            {activeTab === "overview" && (
              <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
                <section>
                  <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-700"><Home size={17} /></span><h2 className="text-base font-extrabold">About this property</h2></div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{p.description || "No description provided."}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    {p.property_type && <span className="rounded-full border border-slate-200 px-3 py-1.5 capitalize">{readable(p.property_type)}</span>}
                    {p.furnishing && <span className="rounded-full border border-slate-200 px-3 py-1.5 capitalize">{readable(p.furnishing)}</span>}
                    {p.ownership && <span className="rounded-full border border-slate-200 px-3 py-1.5 capitalize">{readable(p.ownership)}</span>}
                  </div>
                </section>
                <section>
                  <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-700"><Sparkles size={17} /></span><h2 className="text-base font-extrabold">Amenities</h2></div>
                  {amenities.length > 0 ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">{amenities.map((value) => <span key={String(value)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold capitalize text-slate-700"><Check size={15} className="shrink-0 text-emerald-600" />{readable(value)}</span>)}</div> : <p className="text-sm text-slate-500">No amenities listed.</p>}
                </section>
              </div>
            )}

            {activeTab === "details" && (
              <div className="grid gap-8 lg:grid-cols-3 lg:divide-x lg:divide-slate-100 [&>section:not(:first-child)]:lg:pl-8">
                <InfoGrid title="Listing details" icon={<Building2 size={17} />} values={[["Property type",p.property_type],["Transaction",p.transaction_type],["Listed by",p.posted_by],["BHK",p.bhk],["Bathrooms",p.bathrooms],["Balconies",p.balconies],["Built-up area",p.area_sqft?`${p.area_sqft} ${p.area_unit||"sqft"}`:""],["Carpet area",p.carpet_area],["Floor",p.floor],["Total floors",p.total_floors]]} />
                <InfoGrid title="Complete location" icon={<MapPin size={17} />} values={[["State",p.state],["City",p.city],["Locality / neighbourhood",p.locality],["Full address",p.address],["Landmark",p.landmark],["PIN code",p.pincode]]} />
                <InfoGrid title="Land and access" icon={<Car size={17} />} values={[["Plot length",p.plot_length],["Plot width",p.plot_width],["Approach road width",p.road_width],["Boundary wall",p.boundary_wall],["Gated community",p.gated_community],["Parking",p.parking]]} />
              </div>
            )}

            {activeTab === "terms" && (
              <div className="grid gap-8 lg:grid-cols-2 lg:divide-x lg:divide-slate-100 [&>section:last-child]:lg:pl-8">
                <InfoGrid title="Price details" icon={<Copy size={17} />} values={[["Price",money(p.price)],["Negotiable",p.price_negotiable],["Monthly maintenance",p.maintenance?money(p.maintenance):""],["Security deposit",p.security_deposit?money(p.security_deposit):""],["Brokerage / commission",p.brokerage?money(p.brokerage):""]]} />
                <InfoGrid title="Property status" icon={<ShieldCheck size={17} />} values={[["Furnishing",p.furnishing],["Facing",p.facing],["Ownership",p.ownership],["Availability",p.availability],["Available / possession date",p.available_from],["Property age",p.property_age_years?`${p.property_age_years} years`:""]]} />
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 font-black text-rose-700">{(p.contact_name || "P").charAt(0).toUpperCase()}</span>
            <div><p className="text-xs text-slate-500">Property owner</p><h2 className="font-extrabold text-neutral-900">{p.contact_name || "Property owner"}</h2>{phone && <p className="text-xs text-slate-500">{phone}</p>}</div>
          </div>
          <div className="flex gap-2"><button onClick={inquire} className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 sm:flex-none">Message</button><button onClick={() => window.alert("Visit request sent.")} className="flex-1 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white sm:flex-none">Book a visit</button></div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_-20px_rgba(32,33,36,.5)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-500">{locality || p.property_type}</p><p className="font-black text-neutral-950">{money(p.price)}</p></div><button onClick={inquire} className="rounded-xl border border-rose-200 p-3 text-rose-700" aria-label="Message owner"><MessageCircle size={19} /></button><a href={phone ? `tel:${phone}` : "#"} onClick={(event) => { if (!phone) { event.preventDefault(); window.alert("Owner contact is not available."); } }} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-3 text-sm font-extrabold text-white"><Phone size={17} /> Contact</a></div>
      </div>
    </main>
  );
}
