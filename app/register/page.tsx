"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Gift, Mail, MapPin, Phone, User } from "lucide-react";
import Image from "next/image";
import { authApi, type LoginResponse } from "@/lib/api/auth";
import type { ApiError } from "@/lib/api/client";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
import { useAuth } from "@/providers/AuthContext";
import { INDIA_STATES, DISTRICTS_BY_STATE } from "@/lib/in-states";
import logo from "@/images/logo.png";

const TEAL = "#0d9488";

/** Read JWT `exp` (seconds) without verifying signature — UI only. */
function decodeJwtExpMs(jwt: string): number | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface FormState {
  fullName: string;
  email: string;
  state: string;
  district: string;
  areaLocality: string;
  pincode: string;
  occupationId: string;
  customOccupation: string;
  referralCode: string;
  agreedToTerms: boolean;
  latitude: number | null;
  longitude: number | null;
}

const empty: FormState = {
  fullName: "",
  email: "",
  state: "",
  district: "",
  areaLocality: "",
  pincode: "",
  occupationId: "",
  customOccupation: "",
  referralCode: "",
  agreedToTerms: false,
  latitude: null,
  longitude: null,
};

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [occupations, setOccupations] = useState<{ id: string; name: string }[]>([]);
  const [tokenExpiresAtMs, setTokenExpiresAtMs] = useState<number | null>(null);
  const [, setClock] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authApi
      .listPublicOccupations()
      .then((res) => {
        if (!cancelled) setOccupations(Array.isArray(res?.items) ? res.items : []);
      })
      .catch(() => {
        if (!cancelled) setOccupations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate from sessionStorage (set by Authmodal after OTP verification).
  // If the user landed here without an OTP-verified token, send them home.
  useEffect(() => {
    const t = sessionStorage.getItem("p4u_register_token");
    const p = sessionStorage.getItem("p4u_register_phone");
    if (!t || !p) {
      router.replace("/?needsOtp=1");
      return;
    }
    setRegistrationToken(t);
    setPhone(p);
    setTokenExpiresAtMs(decodeJwtExpMs(t));
  }, [router]);

  useEffect(() => {
    if (!registrationToken) return;
    const id = window.setInterval(() => setClock((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [registrationToken]);

  function goReverifyPhone() {
    sessionStorage.removeItem("p4u_register_token");
    sessionStorage.removeItem("p4u_register_phone");
    router.replace("/?needsOtp=1");
  }

  const districts = useMemo(() => {
    if (!form.state) return [];
    return DISTRICTS_BY_STATE[form.state] || [];
  }, [form.state]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function captureLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(7)),
          longitude: Number(pos.coords.longitude.toFixed(7)),
        }));
        setLocating(false);
      },
      (err) => {
        setError(err.message || "Could not capture location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit() {
    if (submitting) return;
    setError("");

    if (!form.fullName.trim()) return setError("Full name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.state) return setError("Please select your state.");
    if (!form.district) return setError("Please select your district.");
    if (!form.agreedToTerms) {
      return setError("Please accept the Terms and Privacy Policy to continue.");
    }

    setSubmitting(true);
    try {
      const auth: LoginResponse = await authApi.registerCustomerByPhone({
        registrationToken,
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        state: form.state || null,
        district: form.district || null,
        areaLocality: form.areaLocality.trim() || null,
        pincode: form.pincode.trim() || null,
        occupationId: form.customOccupation.trim()
          ? null
          : form.occupationId.trim() || null,
        customOccupation: form.customOccupation.trim().slice(0, 255) || null,
        latitude: form.latitude,
        longitude: form.longitude,
        referralCode: form.referralCode.trim() || null,
      });

      localStorage.setItem("p4u_token", auth.accessToken);
      localStorage.setItem("p4u_refresh_token", auth.refreshToken);
      localStorage.setItem("p4u_token_expires_in", String(auth.expiresIn));
      const cid =
        auth.customerId != null && String(auth.customerId).trim() !== ""
          ? String(auth.customerId)
          : resolveCustomerIdFromAccessToken(auth.accessToken);
      if (cid) localStorage.setItem("p4u_customer_id", cid);

      const tenDigits = phone.replace(/\D/g, "").slice(-10);
      localStorage.setItem("p4u_phone", tenDigits);
      localStorage.setItem("p4u_loggedIn", "true");

      sessionStorage.removeItem("p4u_register_token");
      sessionStorage.removeItem("p4u_register_phone");

      login(tenDigits);
      window.dispatchEvent(new Event("p4u-token-updated"));
      router.replace("/");
    } catch (e: unknown) {
      let msg = "";
      if (e && typeof e === "object") {
        const o = e as Partial<ApiError> & { details?: { message?: string } };
        msg = typeof o.message === "string" ? o.message : "";
        if (!msg && o.details && typeof o.details === "object" && typeof o.details.message === "string") {
          msg = o.details.message;
        }
      }
      if (!msg && e instanceof Error) msg = e.message;
      setError(msg || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fafa]">
      <div className="bg-[#0d9488] pb-12 pt-8 text-center">
        <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-white/10 p-2">
          <Image src={logo} alt="Planext4u" width={56} height={56} priority />
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">Create Account</h1>
        <p className="mt-1 text-sm text-white/80">Join Planext4u and start shopping</p>
      </div>

      <div className="mx-auto -mt-8 max-w-md px-4 pb-16">
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(13,148,136,0.08)]">
          <div className="space-y-4">
            {tokenExpiresAtMs != null && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                <p className="font-semibold">Phone verification window</p>
                <p className="mt-1 text-amber-900/90">
                  {tokenExpiresAtMs <= Date.now() ? (
                    <>
                      This link has expired. Tap <strong>Verify phone again</strong> below, then return here after OTP.
                    </>
                  ) : (
                    <>
                      Submit this form before{" "}
                      <strong>{new Date(tokenExpiresAtMs).toLocaleString()}</strong> (~
                      {Math.max(1, Math.ceil((tokenExpiresAtMs - Date.now()) / 60_000))} min left).
                    </>
                  )}
                </p>
              </div>
            )}

            <Field icon={<User className="h-4 w-4 text-slate-400" />}>
              <input
                className="input-bare"
                placeholder="Full Name *"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
              />
            </Field>

            <Field icon={<Phone className="h-4 w-4 text-slate-400" />}>
              <input
                className="input-bare cursor-not-allowed bg-slate-50"
                value={phone}
                readOnly
                aria-label="Verified mobile number"
              />
            </Field>

            <Field icon={<Mail className="h-4 w-4 text-slate-400" />}>
              <input
                className="input-bare"
                type="email"
                placeholder="Email Address *"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Field>

            <SelectField
              label="State *"
              value={form.state}
              onChange={(v) => {
                setField("state", v);
                setField("district", "");
              }}
              placeholder="Select State"
              options={INDIA_STATES}
            />

            <SelectField
              label="District *"
              value={form.district}
              onChange={(v) => setField("district", v)}
              placeholder={form.state ? "Select District" : "Select state first"}
              options={districts}
              disabled={!form.state}
            />

            <Field icon={null}>
              <input
                className="input-bare"
                placeholder="Area / Locality"
                value={form.areaLocality}
                onChange={(e) => setField("areaLocality", e.target.value)}
              />
            </Field>

            <Field icon={null}>
              <input
                className="input-bare"
                placeholder="Pincode (optional)"
                value={form.pincode}
                onChange={(e) =>
                  setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
              />
            </Field>

            <OccupationSelect
              label="Occupation"
              value={form.occupationId}
              onChange={(v) => {
                setForm((prev) => ({
                  ...prev,
                  occupationId: v,
                  customOccupation: v ? "" : prev.customOccupation,
                }));
              }}
              placeholder="Select occupation (optional)"
              items={occupations}
              disabled={Boolean(form.customOccupation.trim())}
            />
            <p className="mb-1.5 text-xs font-medium text-slate-500">Or type your own</p>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
              <input
                className="input-bare"
                type="text"
                maxLength={255}
                placeholder="e.g. Freelance designer"
                value={form.customOccupation}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    customOccupation: v,
                    occupationId: v.trim() ? "" : prev.occupationId,
                  }));
                }}
                disabled={Boolean(form.occupationId)}
              />
            </label>
            <p className="text-[11px] text-slate-400">
              Pick from the list or enter a custom title (admin sees the same on your profile).
            </p>

            <button
              type="button"
              onClick={captureLocation}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4" />
              {locating
                ? "Locating..."
                : form.latitude && form.longitude
                  ? `Location captured (${form.latitude.toFixed(3)}, ${form.longitude.toFixed(3)})`
                  : "Capture Location"}
            </button>

            <Field icon={<Gift className="h-4 w-4 text-slate-400" />}>
              <input
                className="input-bare"
                placeholder="Referral Code (optional)"
                value={form.referralCode}
                onChange={(e) => setField("referralCode", e.target.value)}
              />
            </Field>

            <label className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50/40 p-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => setField("agreedToTerms", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-teal-600"
              />
              <span>
                I have read and agree to the{" "}
                <a className="font-semibold text-teal-700 underline" href="#">
                  Terms &amp; Conditions
                </a>{" "}
                and{" "}
                <a className="font-semibold text-teal-700 underline" href="#">
                  Privacy Policy
                </a>
                .
                <br />
                <span className="text-amber-600">Tap to read and accept</span>
              </span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            {(error && /expired|jwt expired/i.test(error)) ||
            (tokenExpiresAtMs != null && tokenExpiresAtMs <= Date.now()) ? (
              <button
                type="button"
                onClick={goReverifyPhone}
                className="w-full rounded-2xl border border-teal-600 bg-white px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                Verify phone again
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={
                submitting ||
                !form.agreedToTerms ||
                (tokenExpiresAtMs != null && tokenExpiresAtMs <= Date.now())
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(13,148,136,0.28)] transition disabled:cursor-not-allowed disabled:bg-slate-300"
              style={{ background: submitting || !form.agreedToTerms ? undefined : TEAL }}
            >
              {submitting ? "Verifying..." : "Verify & Register"}
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/" className="font-semibold text-teal-600">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.input-bare) {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          color: #111827;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}

function Field({
  icon,
  children,
}: {
  icon: React.ReactNode | null;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
      {icon}
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <div className="rounded-2xl border border-slate-200 px-3 py-0.5 focus-within:border-teal-500">
        <select
          className="h-10 w-full bg-transparent text-sm text-slate-800 outline-none disabled:cursor-not-allowed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function OccupationSelect({
  label,
  value,
  onChange,
  placeholder,
  items,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  items: { id: string; name: string; isActive?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <div className="rounded-2xl border border-slate-200 px-3 py-0.5 focus-within:border-teal-500">
        <select
          className="h-10 w-full bg-transparent text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-70"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {items.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.isActive === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
