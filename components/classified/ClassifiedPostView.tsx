"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  ImagePlus,
  Info,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react";
import AuthGuard from "@/providers/AuthGuard";
import { classifiedApi, type ClassifiedCategory } from "@/lib/api/classified";
import { loadClassifiedCategories } from "@/lib/classified/categories";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";

const PRIMARY = "#89CFF0";
const MAX_PHOTOS = 10;
const controlClass =
  "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

type SectionCardProps = {
  id: string;
  icon: ReactNode;
  step: string;
  title: string;
  description: string;
  children: ReactNode;
};

function SectionCard({ id, icon, step, title, description, children }: SectionCardProps) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(32,33,36,0.045)]">
      <div className="flex gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Step {step}</span>
          </div>
          <h2 className="text-base font-bold text-neutral-950 sm:text-lg">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function PostFormBody() {
  const router = useRouter();
  const { displayName, loggedPhone } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [adType, setAdType] = useState<"sell" | "wanted">("sell");
  const [condition, setCondition] = useState("used_good");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [negotiable, setNegotiable] = useState(true);
  const [warranty, setWarranty] = useState(false);
  const [invoiceAvailable, setInvoiceAvailable] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [tags, setTags] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [pincode, setPincode] = useState("");
  const [sellerName, setSellerName] = useState(displayName || "");
  const [contactPhone, setContactPhone] = useState(loggedPhone || "");
  const [preferredContact, setPreferredContact] = useState("phone_whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setCategoriesLoading(true);
    loadClassifiedCategories({ forceRefresh: true })
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
    profileApi
      .getMe()
      .then((me) => {
        if (me.phone) setContactPhone(me.phone);
        if (me.name) setSellerName(me.name);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotos((previous) => [...previous, ...Array.from(files)].slice(0, MAX_PHOTOS));
  }

  const enteredImageUrls = () =>
    Array.from(
      new Set(
        imageUrlsText
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => /^https?:\/\//i.test(value)),
      ),
    ).slice(0, MAX_PHOTOS);

  const progressItems = [
    { label: "Listing type", href: "#listing", done: Boolean(categoryId) },
    { label: "Photos", href: "#photos", done: photos.length > 0 || enteredImageUrls().length > 0 },
    { label: "Product details", href: "#product", done: Boolean(title.trim() && description.trim()) },
    { label: "Location & contact", href: "#contact", done: Boolean(stateName.trim() && city.trim() && area.trim() && pincode.trim() && sellerName.trim() && contactPhone.trim()) },
    { label: adType === "wanted" ? "Budget" : "Price", href: "#price", done: Boolean(price.trim()) },
  ];
  const completeCount = progressItems.filter((item) => item.done).length;
  const progress = Math.round((completeCount / progressItems.length) * 100);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!title.trim()) return setError("Title is required.");
    if (!categoryId) return setError("Please select a category.");
    if (!description.trim() || !price.trim() || !stateName.trim() || !city.trim() || !area.trim() || !pincode.trim() || !sellerName.trim() || !contactPhone.trim()) {
      return setError("Please complete all required product, price, location, and seller fields.");
    }
    if (!/^\d{4}$/.test(manufactureYear.trim()) && manufactureYear.trim()) return setError("Enter a valid four-digit manufacture year.");
    if (!/^\d{4,10}$/.test(pincode.trim())) return setError("Enter a valid PIN code.");
    const pastedImageUrls = enteredImageUrls();
    if (!photos.length && !pastedImageUrls.length) return setError("Add at least one clear product photo or image URL.");

    setSubmitting(true);
    try {
      const imageUrls: string[] = [...pastedImageUrls];
      if (photos.length) imageUrls.push(...(await classifiedApi.uploadImages(photos)));
      const keywordList = tags.split(",").map((value) => value.trim()).filter(Boolean);
      const specification = [
        description.trim(), "", "Listing details",
        `Ad type: ${adType === "sell" ? "For sale" : "Wanted"}`,
        `Condition: ${condition.replaceAll("_", " ")}`,
        brand.trim() && `Brand: ${brand.trim()}`,
        model.trim() && `Model: ${model.trim()}`,
        manufactureYear.trim() && `Year: ${manufactureYear.trim()}`,
        `Quantity: ${quantity || "1"}`,
        `Negotiable: ${negotiable ? "Yes" : "No"}`,
        `Warranty: ${warranty ? "Yes" : "No"}`,
        `Invoice available: ${invoiceAvailable ? "Yes" : "No"}`,
        `Delivery available: ${deliveryAvailable ? "Yes" : "No"}`,
        keywordList.length && `Keywords: ${keywordList.join(", ")}`,
        `State: ${stateName.trim()}`,
        `City: ${city.trim()}`,
        `Locality / area: ${area.trim()}`,
        `PIN code: ${pincode.trim()}`,
        `Seller name: ${sellerName.trim()}`,
        `Contact phone: ${contactPhone.trim()}`,
        `Preferred contact: ${preferredContact.replaceAll("_", " ")}`,
      ].filter(Boolean).join("\n");

      await classifiedApi.create({
        title: title.trim(), description: specification, price: price.trim(), categoryId, adType, condition,
        brand: brand.trim(), model: model.trim(), manufactureYear: manufactureYear ? Number(manufactureYear) : undefined,
        quantity: Math.max(1, Number(quantity) || 1), negotiable, warranty, invoiceAvailable, deliveryAvailable,
        state: stateName.trim(), city: city.trim(), area: area.trim(), pincode: pincode.trim(), sellerName: sellerName.trim(),
        contactPhone: contactPhone.trim(), preferredContact, tags: keywordList, imageUrls,
      });
      setSuccess("Your ad was submitted for review. Once approved, it will appear in Classifieds.");
      setTimeout(() => router.push("/classified"), 1400);
    } catch (err: unknown) {
      setError(err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to post ad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7faff] px-4 pb-16 pt-6 sm:px-6 sm:pt-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/classified" className="group mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition group-hover:border-blue-200 group-hover:bg-blue-50">
            <ArrowLeft className="h-4 w-4" />
          </span>
          Back to Classifieds
        </Link>

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" /> Free listing
            </div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">Create your ad</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Add clear details and great photos to connect with the right buyers faster.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:self-auto">
            <ShieldCheck className="h-4 w-4" /> Your contact details stay protected
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-6 lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(32,33,36,0.045)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-neutral-900">Your progress</p>
                <span className="text-sm font-black text-blue-600">{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <nav className="mt-5 space-y-1" aria-label="Form sections">
                {progressItems.map((item) => (
                  <a key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-neutral-950">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${item.done ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-400"}`}>
                      {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                  </a>
                ))}
              </nav>
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                <span className="font-bold text-slate-700">Tip:</span> Listings with multiple clear photos usually get more attention.
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {error ? (
              <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700 shadow-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            ) : null}
            {success ? (
              <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-700 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
              </div>
            ) : null}

            <SectionCard id="listing" step="01" icon={<Tag className="h-5 w-5" />} title="What are you listing?" description="Choose the listing purpose and the best matching category.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">I want to</label>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                    {(["sell", "wanted"] as const).map((type) => (
                      <button key={type} type="button" onClick={() => setAdType(type)} aria-pressed={adType === type} className={`h-10 rounded-lg text-sm font-bold transition ${adType === type ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}>
                        {type === "sell" ? "Sell an item" : "Find an item"}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span>
                  <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={controlClass} required disabled={categoriesLoading}>
                    <option value="">{categoriesLoading ? "Loading categories..." : "Select a category"}</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              </div>
            </SectionCard>

            <SectionCard id="photos" step="02" icon={<ImagePlus className="h-5 w-5" />} title="Show buyers the item" description="Add up to 10 well-lit photos from different angles. At least one image is required.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previewUrls.map((url, index) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={url} alt={`Product preview ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    {index === 0 ? <span className="absolute bottom-2 left-2 rounded-md bg-neutral-950/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">Cover photo</span> : null}
                    <button type="button" onClick={() => setPhotos((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950/70 text-white backdrop-blur transition hover:bg-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS ? (
                  <button type="button" onClick={() => fileRef.current?.click()} className="group flex aspect-square min-h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-3 text-center transition hover:border-blue-400 hover:bg-blue-50">
                    <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm transition group-hover:-translate-y-0.5"><Upload className="h-5 w-5" /></span>
                    <span className="text-sm font-bold text-neutral-800">Add photos</span>
                    <span className="mt-1 text-[11px] text-slate-500">PNG, JPG or WEBP</span>
                  </button>
                ) : null}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => onPickPhotos(event.target.files)} />
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">Have image links instead?</summary>
                <div className="border-t border-slate-100 p-4">
                  <textarea value={imageUrlsText} onChange={(event) => setImageUrlsText(event.target.value)} rows={3} placeholder="Paste URLs separated by commas or new lines" className={`${controlClass} h-auto resize-y py-3`} />
                  <p className="mt-2 text-xs text-slate-500">Only valid http or https image links will be added.</p>
                </div>
              </details>
            </SectionCard>

            <SectionCard id="product" step="03" icon={<FileText className="h-5 w-5" />} title="Describe your item" description="A specific title and honest description help buyers decide quickly.">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-slate-700">Ad title <span className="text-red-500">*</span>
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. iPhone 15 Pro, 256 GB, natural titanium" className={controlClass} required />
                  <span className="mt-1.5 block text-right text-[11px] font-normal text-slate-400">{title.length}/80</span>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Detailed description <span className="text-red-500">*</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mention the condition, key features, age, reason for selling, and anything a buyer should know." rows={6} className={`${controlClass} h-auto resize-y py-3 leading-6`} required />
                </label>
              </div>
            </SectionCard>

            <SectionCard id="details" step="04" icon={<SlidersHorizontal className="h-5 w-5" />} title="Add product details" description="Optional specifics make your listing easier to find and compare.">
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Condition
                  <select value={condition} onChange={(event) => setCondition(event.target.value)} className={controlClass}><option value="new">Brand new</option><option value="like_new">Like new</option><option value="used_good">Used — good</option><option value="used_fair">Used — fair</option><option value="for_parts">For parts / repair</option></select>
                </label>
                <label className="text-sm font-semibold text-slate-700">Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Apple" className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Model<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="e.g. iPhone 15 Pro" className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Year<input type="number" value={manufactureYear} onChange={(event) => setManufactureYear(event.target.value)} placeholder="e.g. 2024" className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Quantity <span className="text-red-500">*</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Search keywords<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="phone, apple, 256gb" className={controlClass} /></label>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Price is negotiable", negotiable, setNegotiable], ["Warranty available", warranty, setWarranty],
                  ["Original invoice available", invoiceAvailable, setInvoiceAvailable], ["Delivery / shipping available", deliveryAvailable, setDeliveryAvailable],
                ].map(([label, checked, setter]) => (
                  <label key={String(label)} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition ${checked ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>
                    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="h-4 w-4 rounded accent-blue-600" />{String(label)}
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard id="contact" step="05" icon={<MapPin className="h-5 w-5" />} title="Location & contact" description="Tell nearby buyers where the item is available and how they should reach you.">
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">State <span className="text-red-500">*</span><input value={stateName} onChange={(event) => setStateName(event.target.value)} placeholder="Enter state" required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">City <span className="text-red-500">*</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter city" required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Area / locality <span className="text-red-500">*</span><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Andheri West" required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">PIN code <span className="text-red-500">*</span><input inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit PIN code" required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Seller name <span className="text-red-500">*</span><input value={sellerName} onChange={(event) => setSellerName(event.target.value)} required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700">Mobile / WhatsApp <span className="text-red-500">*</span><input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="10-digit mobile number" required className={controlClass} /></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Preferred contact
                  <select value={preferredContact} onChange={(event) => setPreferredContact(event.target.value)} className={controlClass}><option value="phone_whatsapp">Phone and WhatsApp</option><option value="phone">Phone calls only</option><option value="chat">In-app chat only</option></select>
                </label>
              </div>
              {displayName ? <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Posting as {displayName}</p> : null}
            </SectionCard>

            <SectionCard id="price" step="06" icon={<BadgeIndianRupee className="h-5 w-5" />} title={adType === "wanted" ? "Set your budget" : "Set your price"} description={adType === "wanted" ? "Let sellers know the maximum amount you plan to spend." : "Choose a fair price to attract serious buyers."}>
              <label className="block text-sm font-semibold text-slate-700">{adType === "wanted" ? "Maximum budget" : "Selling price"} <span className="text-red-500">*</span>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center border-r border-slate-200 text-lg font-bold text-slate-500">₹</span>
                  <input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" className={`${controlClass} mt-0 pl-16 text-lg font-bold`} required />
                </div>
              </label>
            </SectionCard>

            <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_14px_40px_rgba(32,33,36,0.16)] backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-4">
              <div className="mb-3 flex items-center gap-3 px-1 sm:mb-0">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 sm:flex"><ShieldCheck className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-neutral-900">Ready to find a buyer?</p><p className="mt-0.5 text-xs text-slate-500">Your ad will go live after a quick review.</p></div>
              </div>
              <button type="submit" disabled={submitting} className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-[0_8px_20px_rgba(137,207,240,0.25)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:pointer-events-none disabled:opacity-60 sm:w-auto" style={{ backgroundColor: PRIMARY }}>
                {submitting ? "Publishing ad..." : "Submit for review"}<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClassifiedPostView() {
  return <AuthGuard><PostFormBody /></AuthGuard>;
}
