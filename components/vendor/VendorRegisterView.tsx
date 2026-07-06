"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";
import { INDIA_STATES, DISTRICTS_BY_STATE } from "@/lib/in-states";
import {
  buildVendorRegisterPayload,
  type VendorKindChoice,
} from "@/lib/vendor/registerPayload";

const TEAL = "#17a2b8";
const STEPS = ["Personal", "Business", "KYC", "Bank", "Review"] as const;

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91-${d.slice(0, 3)}***${d.slice(-3)}` : raw;
}

function validatePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "Mobile number is required.";
  if (d.length !== 10) return "Enter a valid 10-digit mobile number.";
  if (!/^[6-9]/.test(d)) return "Number must start with 6, 7, 8 or 9.";
  return "";
}

const inputClass =
  "h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#17a2b8] focus:ring-2 focus:ring-[#17a2b8]/20";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export default function VendorRegisterView() {
  const router = useRouter();
  const { displayName, loggedPhone, isLoggedIn } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [personal, setPersonal] = useState({
    name: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    state: "",
    district: "",
    pincode: "",
    facebook: "",
    instagram: "",
  });

  const [business, setBusiness] = useState({
    businessName: "",
    vendorKind: "PRODUCT" as VendorKindChoice,
    categorySlug: "",
    serviceName: "",
    gst: "",
    pan: "",
    stateCode: "",
    shopAddress: "",
  });

  const [kyc, setKyc] = useState({ gstCertName: "", panCardName: "" });
  const [bank, setBank] = useState({
    bankName: "",
    ifscCode: "",
    accountHolderName: "",
    accountNumber: "",
  });

  const districts = useMemo(
    () => (personal.state ? DISTRICTS_BY_STATE[personal.state] ?? [] : []),
    [personal.state],
  );

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  useEffect(() => {
    setPersonal((p) => ({
      ...p,
      name: p.name || displayName || "",
      phone: p.phone || loggedPhone?.replace(/\D/g, "").slice(-10) || "",
    }));
    if (!isLoggedIn) return;
    profileApi
      .getMe()
      .then((me) => {
        setPersonal((p) => ({
          ...p,
          name: p.name || me.name || displayName || "",
          phone: p.phone || me.phone?.replace(/\D/g, "").slice(-10) || "",
          email: p.email || me.email || "",
        }));
      })
      .catch(() => undefined);
  }, [displayName, loggedPhone, isLoggedIn]);

  function validateStep(index: number): string {
    if (index === 0) {
      if (!personal.name.trim()) return "Name is required.";
      const phoneErr = validatePhone(personal.phone);
      if (phoneErr) return phoneErr;
      if (!personal.email.trim()) return "Email is required.";
      if (!personal.state) return "State is required.";
      if (!personal.district.trim()) return "District is required.";
    }
    if (index === 1) {
      if (!business.businessName.trim()) return "Business name is required.";
      if (business.vendorKind === "PRODUCT" && !business.categorySlug.trim()) {
        return "Product category is required.";
      }
      if (business.vendorKind === "SERVICE" && !business.serviceName.trim()) {
        return "Service type is required.";
      }
      if (business.stateCode.trim() && !/^\d{2}$/.test(business.stateCode.trim())) {
        return "State code must be 2 digits (GST place of supply).";
      }
    }
    return "";
  }

  function validateAllSteps(): string {
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const msg = validateStep(i);
      if (msg) return msg;
    }
    return "";
  }

  function goNext() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function buildPayload() {
    return buildVendorRegisterPayload({ personal, business, kyc, bank });
  }

  async function handleSubmit() {
    const msg = validateAllSteps();
    if (msg) {
      setError(msg);
      if (!personal.name.trim() || validatePhone(personal.phone)) setStep(0);
      else if (!business.businessName.trim()) setStep(1);
      else setStep(1);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.registerVendor(buildPayload());
      setSuccess(true);
    } catch (e: unknown) {
      setError(
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Registration submitted</h2>
        <p className="mt-3 text-sm text-gray-600">
          Your seller application was submitted successfully. Admin will review it within 24 hours.
          After approval, sign in at the vendor portal with your mobile OTP.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/home"
            className="inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <button
        type="button"
        onClick={() => (step > 0 ? goBack() : router.back())}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Become a Seller
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Become a Seller</h1>
        </div>
        <p className="text-sm font-semibold text-gray-600">{progressPct}%</p>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: TEAL }}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              idx === step ? "text-white" : "bg-gray-100 text-gray-600"
            }`}
            style={idx === step ? { backgroundColor: TEAL } : undefined}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {step === 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Name" required>
                <input
                  className={inputClass}
                  value={personal.name}
                  onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                />
              </Field>
              <Field label="Phone" required>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={10}
                  value={personal.phone}
                  onChange={(e) =>
                    setPersonal({ ...personal, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                />
              </Field>
              <Field label="Secondary Phone">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={10}
                  value={personal.secondaryPhone}
                  onChange={(e) =>
                    setPersonal({
                      ...personal,
                      secondaryPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  className={inputClass}
                  value={personal.email}
                  onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                />
              </Field>
              <Field label="State" required>
                <select
                  className={inputClass}
                  value={personal.state}
                  onChange={(e) =>
                    setPersonal({ ...personal, state: e.target.value, district: "" })
                  }
                >
                  <option value="">Select State</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="District" required>
                {districts.length ? (
                  <select
                    className={inputClass}
                    value={personal.district}
                    onChange={(e) => setPersonal({ ...personal, district: e.target.value })}
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputClass}
                    placeholder={personal.state ? "Enter district" : "Select state first"}
                    disabled={!personal.state}
                    value={personal.district}
                    onChange={(e) => setPersonal({ ...personal, district: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Pincode (optional)">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={6}
                  value={personal.pincode}
                  onChange={(e) =>
                    setPersonal({ ...personal, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                />
              </Field>
              <Field label="Facebook Link">
                <input
                  className={inputClass}
                  placeholder="https://..."
                  value={personal.facebook}
                  onChange={(e) => setPersonal({ ...personal, facebook: e.target.value })}
                />
              </Field>
              <Field label="Instagram Link">
                <input
                  className={inputClass}
                  placeholder="https://..."
                  value={personal.instagram}
                  onChange={(e) => setPersonal({ ...personal, instagram: e.target.value })}
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Business Name" required>
                <input
                  className={inputClass}
                  value={business.businessName}
                  onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
                />
              </Field>
              <Field label="Vendor Type" required>
                <select
                  className={inputClass}
                  value={business.vendorKind}
                  onChange={(e) =>
                    setBusiness({ ...business, vendorKind: e.target.value as VendorKindChoice })
                  }
                >
                  <option value="PRODUCT">Product Seller</option>
                  <option value="SERVICE">Service Provider</option>
                </select>
              </Field>
              {business.vendorKind === "PRODUCT" ? (
                <Field label="Product Category" required>
                  <input
                    className={inputClass}
                    placeholder="e.g. Electronics, Groceries"
                    value={business.categorySlug}
                    onChange={(e) => setBusiness({ ...business, categorySlug: e.target.value })}
                  />
                </Field>
              ) : (
                <Field label="Service Type" required>
                  <input
                    className={inputClass}
                    placeholder="e.g. Salon, Plumbing"
                    value={business.serviceName}
                    onChange={(e) => setBusiness({ ...business, serviceName: e.target.value })}
                  />
                </Field>
              )}
              <Field label="GSTIN">
                <input
                  className={inputClass}
                  maxLength={15}
                  value={business.gst}
                  onChange={(e) => setBusiness({ ...business, gst: e.target.value })}
                />
              </Field>
              <Field label="PAN">
                <input
                  className={inputClass}
                  maxLength={10}
                  value={business.pan}
                  onChange={(e) => setBusiness({ ...business, pan: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="State Code (GST place of supply, 2 digits)">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="e.g. 33 for Tamil Nadu"
                  value={business.stateCode}
                  onChange={(e) =>
                    setBusiness({ ...business, stateCode: e.target.value.replace(/\D/g, "").slice(0, 2) })
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Shop / Business Address">
                  <input
                    className={inputClass}
                    value={business.shopAddress}
                    onChange={(e) => setBusiness({ ...business, shopAddress: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">KYC &amp; Documents</h2>
            <p className="text-sm text-gray-500">Upload GST certificate and PAN for admin verification.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="GST Certificate">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className={inputClass}
                  onChange={(e) =>
                    setKyc((p) => ({ ...p, gstCertName: e.target.files?.[0]?.name ?? "" }))
                  }
                />
              </Field>
              <Field label="PAN Card">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className={inputClass}
                  onChange={(e) =>
                    setKyc((p) => ({ ...p, panCardName: e.target.files?.[0]?.name ?? "" }))
                  }
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Bank Name">
                <input
                  className={inputClass}
                  value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                />
              </Field>
              <Field label="IFSC Code">
                <input
                  className={inputClass}
                  value={bank.ifscCode}
                  onChange={(e) => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Account Holder Name">
                <input
                  className={inputClass}
                  value={bank.accountHolderName}
                  onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })}
                />
              </Field>
              <Field label="Account Number">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "") })
                  }
                />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-2 text-sm text-gray-700">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Review</h2>
            <p><span className="font-medium">Owner name:</span> {personal.name}</p>
            <p><span className="font-medium">Mobile:</span> {personal.phone ? maskPhone(personal.phone) : "—"}</p>
            {personal.secondaryPhone ? (
              <p><span className="font-medium">Secondary phone:</span> {maskPhone(personal.secondaryPhone)}</p>
            ) : null}
            <p><span className="font-medium">Email:</span> {personal.email}</p>
            <p><span className="font-medium">State / District:</span> {[personal.state, personal.district].filter(Boolean).join(" / ") || "—"}</p>
            {personal.pincode ? <p><span className="font-medium">Pincode:</span> {personal.pincode}</p> : null}
            {(personal.facebook || personal.instagram) ? (
              <p><span className="font-medium">Social:</span> {[personal.facebook, personal.instagram].filter(Boolean).join(" · ")}</p>
            ) : null}
            <p><span className="font-medium">Business:</span> {business.businessName} ({business.vendorKind === "PRODUCT" ? "Product" : "Service"})</p>
            <p><span className="font-medium">{business.vendorKind === "SERVICE" ? "Services" : "Category"}:</span> {business.vendorKind === "SERVICE" ? business.serviceName : business.categorySlug}</p>
            <p><span className="font-medium">GSTIN:</span> {business.gst || "—"}</p>
            <p><span className="font-medium">PAN:</span> {business.pan || "—"}</p>
            <p><span className="font-medium">State code:</span> {business.stateCode || "—"}</p>
            <p><span className="font-medium">Shop address:</span> {business.shopAddress || "—"}</p>
            <p><span className="font-medium">GST certificate:</span> {kyc.gstCertName || "—"}</p>
            <p><span className="font-medium">PAN card:</span> {kyc.panCardName || "—"}</p>
            <p><span className="font-medium">Bank:</span> {bank.bankName || "—"}</p>
            <p><span className="font-medium">IFSC:</span> {bank.ifscCode || "—"}</p>
            <p><span className="font-medium">Account holder:</span> {bank.accountHolderName || "—"}</p>
            <p><span className="font-medium">Account number:</span> {bank.accountNumber ? "••••" + bank.accountNumber.slice(-4) : "—"}</p>
            <p className="pt-3 text-xs text-gray-500">
              Submitting queues your application for admin approval (same as vendor portal registration).
              Sign in at the vendor portal with mobile OTP after approval.
            </p>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="ml-auto rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
