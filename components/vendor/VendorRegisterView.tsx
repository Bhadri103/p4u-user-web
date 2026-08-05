"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, BadgeIndianRupee, CheckCircle2, Loader2, ShieldCheck, Store } from "lucide-react";
import authIllustration from "@/images/auth/login.png";
import { authApi } from "@/lib/api/auth";
import {
  buildVendorRegisterPayload,
  type VendorKindChoice,
} from "@/lib/vendor/registerPayload";

const TEAL = "#4C9ED6";
const STEPS = ["Personal", "Business", "KYC", "Bank", "Review"] as const;
const inputClass = "h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#89CFF0] focus:ring-2 focus:ring-[#89CFF0]/20";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}

function Review({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-3 border-b border-gray-100 py-2"><span className="min-w-[145px] text-gray-500">{label}</span><span className="font-medium text-gray-800">{value || "-"}</span></div>;
}

function maskPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(-10);
  return digits ? `+91-${digits.slice(0, 3)}***${digits.slice(-3)}` : "";
}

function validatePhone(raw: string, label: string) {
  const digits = raw.replace(/\D/g, "");
  return digits && !/^[6-9]\d{9}$/.test(digits) ? `Enter a valid 10-digit ${label}.` : "";
}

export default function VendorRegisterView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug?: string | null }>>([]);
  const [categoryChoice, setCategoryChoice] = useState("");
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: string; name: string; slug?: string | null }>>([]);
  const [serviceChoice, setServiceChoice] = useState("");
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [personal, setPersonal] = useState({ name: "", phone: "", secondaryPhone: "", email: "" });
  const [business, setBusiness] = useState({
    businessName: "",
    businessType: "",
    vendorKind: "" as VendorKindChoice,
    categorySlug: "",
    serviceName: "",
    state: "",
    district: "",
    shopAddress: "",
  });
  const [kyc, setKyc] = useState({
    aadhaarNumber: "",
    aadhaarFrontName: "",
    aadhaarBackName: "",
    pan: "",
    panCardName: "",
    gst: "",
    gstCertName: "",
  });
  const [bank, setBank] = useState({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
  });

  useEffect(() => {
    authApi.registrationProductCategories()
      .then((rows) => setCategories(rows.filter((row) => row.id && row.name)))
      .catch(() => setCategoriesError("Categories could not be loaded. You can add one manually."))
      .finally(() => setCategoriesLoading(false));
    authApi.registrationServiceCategories()
      .then((rows) => setServiceCategories(rows.filter((row) => row.id && row.name)))
      .catch(() => setServicesError("Services could not be loaded. You can add one manually."))
      .finally(() => setServicesLoading(false));
  }, []);

  function validateStep(index: number) {
    if (index === 0) {
      if (personal.name.trim() && personal.name.trim().length < 2) return "Owner name must be at least 2 characters.";
      const primary = validatePhone(personal.phone, "phone number");
      if (primary) return primary;
      const secondary = validatePhone(personal.secondaryPhone, "secondary phone number");
      if (secondary) return secondary;
      if (personal.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim())) return "Enter a valid email address.";
    }
    if (index === 2) {
      if (kyc.aadhaarNumber && !/^\d{12}$/.test(kyc.aadhaarNumber)) return "Aadhaar must contain 12 digits.";
      if (kyc.pan.trim() && !/^[A-Z0-9]{10}$/.test(kyc.pan.trim().toUpperCase())) return "PAN must contain 10 letters and digits.";
      if (kyc.gst.trim() && !/^[0-9A-Z]{15}$/.test(kyc.gst.trim().toUpperCase())) return "GST must contain 15 letters and digits.";
    }
    if (index === 3) {
      if (bank.accountNumber && !/^\d{9,18}$/.test(bank.accountNumber)) return "Account number must contain 9 to 18 digits.";
      if (bank.confirmAccountNumber && bank.confirmAccountNumber !== bank.accountNumber) return "Account numbers do not match.";
      if (bank.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.trim().toUpperCase())) return "Enter a valid IFSC code.";
    }
    return "";
  }

  function next() {
    const message = validateStep(step);
    if (message) return setError(message);
    setError("");
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError("");
    setStep((value) => Math.max(value - 1, 0));
  }

  async function submit() {
    for (const index of [0, 1, 2, 3]) {
      const message = validateStep(index);
      if (message) {
        setError(message);
        setStep(index);
        return;
      }
    }
    setError("");
    setLoading(true);
    try {
      await authApi.registerVendor(buildVendorRegisterPayload({ personal, business, kyc, bank }));
      setSuccess(true);
    } catch (caught: unknown) {
      setError((caught as { message?: string })?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fileField = (label: string, selected: string, onSelect: (name: string) => void) => (
    <Field label={label}>
      <input type="file" accept="image/*,.pdf" className={inputClass} onChange={(event) => onSelect(event.target.files?.[0]?.name ?? "")} />
      {selected ? <span className="mt-1 block text-xs text-gray-500">Selected: {selected}</span> : null}
    </Field>
  );

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Registration submitted</h2>
        <p className="mt-3 text-sm text-gray-600">Your seller application is queued for admin review. After approval, sign in at the vendor portal using mobile OTP.</p>
        <Link href="/home" className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: TEAL }}>Back to Home</Link>
      </div>
    );
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <button type="button" onClick={() => (step ? back() : router.back())} className="mb-4 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-gray-700 hover:bg-[#E9F5FD]"><ArrowLeft className="h-4 w-4" />Back</button>
      <div className="overflow-hidden rounded-3xl border border-[#D6E8F3] bg-white lg:grid lg:grid-cols-[0.78fr_1.35fr]">
        <aside className="hidden min-h-[650px] flex-col justify-between border-r border-[#D6E8F3] bg-[#E9F5FD] p-8 lg:flex xl:p-10">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4C9ED6] text-white"><Store className="h-5 w-5 text-white" /></span>
              <div><p className="font-bold text-[#17212B]">P4U Vendor</p><p className="text-xs text-[#687783]">Grow your business online</p></div>
            </div>
            <h1 className="mt-7 text-3xl font-bold leading-tight text-[#17212B] xl:text-4xl">Turn your business into a digital storefront.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#687783]">Register once to manage products, services, orders, bookings and settlements from the P4U vendor portal.</p>
          </div>
          <div className="relative mx-auto my-6 aspect-square w-full max-w-[300px]">
            <Image src={authIllustration} alt="P4U vendor registration" fill className="object-contain" sizes="300px" priority />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[#17212B]">
            <div className="flex items-center gap-2 rounded-xl bg-white p-3"><ShieldCheck className="h-4 w-4 text-[#35A28D]" />Secure onboarding</div>
            <div className="flex items-center gap-2 rounded-xl bg-white p-3"><BadgeIndianRupee className="h-4 w-4 text-[#4C9ED6]" />Simple settlements</div>
          </div>
        </aside>

        <div className="min-w-0 p-5 sm:p-7 lg:p-8 xl:p-10">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4C9ED6]">Step {step + 1} of 5</p><h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Become a Vendor</h1><p className="mt-1 text-sm text-gray-500">Complete the details below to create your vendor application.</p></div>
            <p className="rounded-full bg-[#E9F5FD] px-3 py-1 text-sm font-bold text-[#327FB5]">{progress}%</p>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#E9F5FD]"><div className="h-full rounded-full bg-[#4C9ED6] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          <div className="mb-6 grid grid-cols-5 gap-1.5">{STEPS.map((label, index) => <button type="button" onClick={() => index < step && setStep(index)} key={label} className={`min-w-0 rounded-xl border px-1 py-2 text-[10px] font-semibold sm:px-2 sm:text-xs ${index === step ? "border-[#4C9ED6] bg-[#4C9ED6] text-white" : index < step ? "border-[#B9DCEC] bg-[#E9F5FD] text-[#327FB5]" : "border-[#D6E8F3] bg-white text-gray-500"}`}>{label}</button>)}</div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {step === 0 ? <section className="space-y-4"><div><h2 className="text-lg font-semibold">Personal Details</h2><p className="text-sm text-gray-500">Nothing is copied automatically from your customer profile.</p></div><div className="grid gap-4 md:grid-cols-2">
          <Field label="Owner Name"><input className={inputClass} value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputClass} inputMode="numeric" maxLength={10} value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></Field>
          <Field label="Secondary Phone"><input className={inputClass} inputMode="numeric" maxLength={10} value={personal.secondaryPhone} onChange={(e) => setPersonal({ ...personal, secondaryPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></Field>
          <Field label="Email"><input className={inputClass} type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></Field>
        </div></section> : null}

        {step === 1 ? <section className="space-y-4"><div><h2 className="text-lg font-semibold">Business Details</h2><p className="text-sm text-gray-500">Choose and enter these values manually.</p></div><div className="grid gap-4 md:grid-cols-2">
          <Field label="Business Name"><input className={inputClass} value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} /></Field>
          <Field label="Business Type"><select className={inputClass} value={business.businessType} onChange={(e) => setBusiness({ ...business, businessType: e.target.value })}><option value="">No selection</option><option value="proprietorship">Proprietorship</option><option value="partnership">Partnership</option><option value="pvt_ltd">Private Limited</option></select></Field>
          <Field label="Vendor Type"><select className={inputClass} value={business.vendorKind} onChange={(e) => setBusiness({ ...business, vendorKind: e.target.value as VendorKindChoice })}><option value="">No selection</option><option value="PRODUCT">Product</option><option value="SERVICE">Service</option><option value="BOTH">Both</option></select></Field>
          {business.vendorKind === "PRODUCT" || business.vendorKind === "BOTH" ? <Field label="Product Category"><select className={inputClass} value={categoryChoice} onChange={(e) => { const choice = e.target.value; const match = categories.find((row) => row.id === choice); setCategoryChoice(choice); setBusiness({ ...business, categorySlug: choice === "__new__" ? "" : match?.slug || match?.name || "" }); }}><option value="">No category selected</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}<option value="__new__">+ Add new category</option></select>{categoriesLoading ? <span className="mt-1 block text-xs text-gray-500">Loading categories...</span> : null}{categoriesError ? <span className="mt-1 block text-xs text-amber-700">{categoriesError}</span> : null}{categoryChoice === "__new__" ? <input className={`${inputClass} mt-2`} placeholder="Type new category name" value={business.categorySlug} onChange={(e) => setBusiness({ ...business, categorySlug: e.target.value })} /> : null}</Field> : null}
          {business.vendorKind === "SERVICE" || business.vendorKind === "BOTH" ? <Field label="Service"><select className={inputClass} value={serviceChoice} onChange={(e) => { const choice = e.target.value; const match = serviceCategories.find((row) => row.id === choice); setServiceChoice(choice); setBusiness({ ...business, serviceName: choice === "__new__" ? "" : match?.slug || match?.name || "" }); }}><option value="">No service selected</option>{serviceCategories.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}<option value="__new__">+ Add new service</option></select>{servicesLoading ? <span className="mt-1 block text-xs text-gray-500">Loading services...</span> : null}{servicesError ? <span className="mt-1 block text-xs text-amber-700">{servicesError}</span> : null}{serviceChoice === "__new__" ? <input className={`${inputClass} mt-2`} placeholder="Type new service name" value={business.serviceName} onChange={(e) => setBusiness({ ...business, serviceName: e.target.value })} /> : null}</Field> : null}
          <Field label="State"><input className={inputClass} value={business.state} onChange={(e) => setBusiness({ ...business, state: e.target.value })} /></Field>
          <Field label="District"><input className={inputClass} value={business.district} onChange={(e) => setBusiness({ ...business, district: e.target.value })} /></Field>
          <Field label="Shop Address"><input className={inputClass} value={business.shopAddress} onChange={(e) => setBusiness({ ...business, shopAddress: e.target.value })} /></Field>
        </div></section> : null}

        {step === 2 ? <section className="space-y-4"><div><h2 className="text-lg font-semibold">KYC &amp; Documents</h2><p className="text-sm text-gray-500">Aadhaar, PAN, GST and document selections are optional.</p></div><div className="grid gap-4 md:grid-cols-2">
          <Field label="Aadhaar Number"><input className={inputClass} inputMode="numeric" maxLength={12} value={kyc.aadhaarNumber} onChange={(e) => setKyc({ ...kyc, aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></Field><div />
          {fileField("Aadhaar Front", kyc.aadhaarFrontName, (value) => setKyc({ ...kyc, aadhaarFrontName: value }))}{fileField("Aadhaar Back", kyc.aadhaarBackName, (value) => setKyc({ ...kyc, aadhaarBackName: value }))}
          <Field label="PAN Number"><input className={inputClass} maxLength={10} value={kyc.pan} onChange={(e) => setKyc({ ...kyc, pan: e.target.value.toUpperCase() })} /></Field>{fileField("PAN Card", kyc.panCardName, (value) => setKyc({ ...kyc, panCardName: value }))}
          <Field label="GST Number"><input className={inputClass} maxLength={15} value={kyc.gst} onChange={(e) => setKyc({ ...kyc, gst: e.target.value.toUpperCase() })} /></Field>{fileField("GST Certificate", kyc.gstCertName, (value) => setKyc({ ...kyc, gstCertName: value }))}
        </div></section> : null}

        {step === 3 ? <section className="space-y-4"><div><h2 className="text-lg font-semibold">Bank Details</h2><p className="text-sm text-gray-500">Optional settlement account details.</p></div><div className="grid gap-4 md:grid-cols-2">
          <Field label="Bank Name"><input className={inputClass} value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} /></Field>
          <Field label="Account Holder Name"><input className={inputClass} value={bank.accountHolderName} onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })} /></Field>
          <Field label="Account Number"><input className={inputClass} inputMode="numeric" maxLength={18} value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) })} /></Field>
          <Field label="Confirm Account Number"><input className={inputClass} inputMode="numeric" maxLength={18} value={bank.confirmAccountNumber} onChange={(e) => setBank({ ...bank, confirmAccountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) })} /></Field>
          <Field label="IFSC Code"><input className={inputClass} maxLength={11} value={bank.ifscCode} onChange={(e) => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })} /></Field>
        </div></section> : null}

        {step === 4 ? <section className="space-y-1 text-sm"><h2 className="mb-3 text-lg font-semibold">Review &amp; Submit</h2>
          <Review label="Owner Name" value={personal.name} /><Review label="Phone" value={maskPhone(personal.phone)} /><Review label="Secondary Phone" value={maskPhone(personal.secondaryPhone)} /><Review label="Email" value={personal.email} />
          <Review label="Business Name" value={business.businessName} /><Review label="Business Type" value={business.businessType} /><Review label="Vendor Type" value={business.vendorKind} /><Review label="Product Category" value={business.categorySlug} /><Review label="Service Name" value={business.serviceName} /><Review label="State" value={business.state} /><Review label="District" value={business.district} /><Review label="Shop Address" value={business.shopAddress} />
          <Review label="Aadhaar" value={kyc.aadhaarNumber} /><Review label="Aadhaar Front" value={kyc.aadhaarFrontName} /><Review label="Aadhaar Back" value={kyc.aadhaarBackName} /><Review label="PAN" value={kyc.pan} /><Review label="PAN Card" value={kyc.panCardName} /><Review label="GST" value={kyc.gst} /><Review label="GST Certificate" value={kyc.gstCertName} />
          <Review label="Bank Name" value={bank.bankName} /><Review label="Account Holder" value={bank.accountHolderName} /><Review label="Account Number" value={bank.accountNumber ? `****${bank.accountNumber.slice(-4)}` : ""} /><Review label="IFSC" value={bank.ifscCode} />
          <p className="pt-4 text-xs text-gray-500">Submitting queues the application for admin approval. Sign in at the vendor portal using mobile OTP after approval.</p>
        </section> : null}

        <div className="mt-6 flex justify-between gap-3">{step > 0 ? <button type="button" onClick={back} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700">Back</button> : <span />}{step < 4 ? <button type="button" onClick={next} className="p4u-auth-primary ml-auto rounded-xl border border-[#4C9ED6] bg-[#4C9ED6] px-6 py-3 text-sm font-semibold text-white">Next</button> : <button type="button" onClick={() => void submit()} disabled={loading} className="p4u-auth-primary ml-auto inline-flex items-center gap-2 rounded-xl border border-[#4C9ED6] bg-[#4C9ED6] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Submit Application</button>}</div>
      </div>
        </div>
      </div>
    </div>
  );
}
