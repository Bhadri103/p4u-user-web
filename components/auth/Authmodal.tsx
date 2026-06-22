"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationResult } from "firebase/auth";
import { X } from "lucide-react";
import Image from "next/image";
import authIllustration from "../../images/auth/login.png";
import {
  authApi,
  type LoginResponse,
  type PublicOccupation,
  type SignupProfilePayload,
} from "@/lib/api/auth";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
import { sendPhoneOtp, clearRecaptcha } from "@/lib/firebase";

type Step = "phone" | "otp" | "success";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (phone: string) => void;
}

const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const OTP_LEN = 6;
const RESEND_S = 30;
const RECAPTCHA_ID = "p4u-recaptcha";

type AuthTab = "signin" | "signup";

function validateEmail(raw: string): string {
  const s = raw.trim();
  if (!s) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Enter a valid email address.";
  return "";
}

function validatePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "Mobile number is required.";
  if (d.length !== 10) return "Enter a valid 10-digit mobile number.";
  if (!/^[6-9]/.test(d)) return "Number must start with 6, 7, 8 or 9.";
  return "";
}

function maskPhone(p: string) {
  const digits = p.replace(/\D/g, "").slice(-10);
  return `+91-${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

function toE164(raw: string): string {
  return `+91${raw.replace(/\D/g, "").slice(-10)}`;
}

function Spinner() {
  return (
    <span
      style={{
        width: 13,
        height: 13,
        border: "2px solid rgba(255,255,255,0.35)",
        borderTopColor: "white",
        borderRadius: "50%",
        display: "inline-block",
        animation: "auth-spin 0.65s linear infinite",
      }}
    />
  );
}

const inputRowStyle = (hasError: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
  background: "white",
});

const bareInput: CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: 13,
  color: "#111827",
  background: "transparent",
  flex: 1,
  fontFamily: "inherit",
};

// ─── Step 1: Phone entry (sign in) or signup profile + phone ───────
function PhoneStep({
  tab,
  onTabChange,
  onSent,
}: {
  tab: AuthTab;
  onTabChange: (t: AuthTab) => void;
  onSent: (
    phone: string,
    confirmation: ConfirmationResult,
    signup: SignupProfilePayload | null,
  ) => void;
}) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [occupationId, setOccupationId] = useState("");
  const [customOccupation, setCustomOccupation] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [occupations, setOccupations] = useState<PublicOccupation[]>([]);
  const [occLoading, setOccLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, [tab]);

  useEffect(() => {
    if (tab !== "signup") return;
    let cancelled = false;
    setOccLoading(true);
    authApi
      .listPublicOccupations()
      .then((res) => {
        if (!cancelled) setOccupations(Array.isArray(res?.items) ? res.items : []);
      })
      .catch(() => {
        if (!cancelled) setOccupations([]);
      })
      .finally(() => {
        if (!cancelled) setOccLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function submit() {
    if (submitLock.current) return;
    const v = validatePhone(phone);
    if (v) {
      setError(v);
      return;
    }
    if (tab === "signup") {
      if (!fullName.trim()) {
        setError("Full name is required.");
        return;
      }
      const ev = validateEmail(email);
      if (ev) {
        setError(ev);
        return;
      }
      if (!agreedToTerms) {
        setError("Please accept the Terms of Service and Privacy Policy.");
        return;
      }
    }
    setError("");
    submitLock.current = true;
    setLoading(true);
    try {
      const confirmation = await sendPhoneOtp(toE164(phone), RECAPTCHA_ID);
      const digits = phone.replace(/\D/g, "").slice(-10);
      const customTrim = customOccupation.trim().slice(0, 255);
      const signup: SignupProfilePayload | null =
        tab === "signup"
          ? {
              fullName: fullName.trim(),
              email: email.trim(),
              occupationId: customTrim ? null : occupationId.trim() || null,
              customOccupation: customTrim || null,
            }
          : null;
      onSent(digits, confirmation, signup);
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code.includes("too-many-requests")) {
        setError("Too many OTP attempts. Please try again later.");
      } else if (code.includes("invalid-phone-number")) {
        setError("Invalid phone number for OTP delivery.");
      } else if (code.includes("operation-not-allowed")) {
        setError(
          "Phone sign-in is not enabled in Firebase. Ask the admin to enable it.",
        );
      } else {
        setError(err?.message || "Failed to send OTP. Please retry.");
      }
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  const fieldErr = Boolean(error);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          marginBottom: 14,
          padding: 3,
          borderRadius: 10,
          background: "#f3f4f6",
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onTabChange("signin");
            setCustomOccupation("");
            setError("");
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            background: tab === "signin" ? "white" : "transparent",
            color: tab === "signin" ? TEAL : "#6b7280",
            boxShadow: tab === "signin" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            onTabChange("signup");
            setCustomOccupation("");
            setError("");
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            background: tab === "signup" ? "white" : "transparent",
            color: tab === "signup" ? TEAL : "#6b7280",
            boxShadow: tab === "signup" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
          }}
        >
          Sign up
        </button>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
        {tab === "signin" ? "Sign in with your mobile" : "Create your account"}
      </h2>
      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px" }}>
        {tab === "signin"
          ? "We'll send a 6-digit OTP to your phone."
          : "Enter your details, then we'll verify your mobile with a 6-digit OTP."}
      </p>

      {tab === "signup" && (
        <>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            Full name *
          </label>
          <div style={{ ...inputRowStyle(fieldErr && !fullName.trim()), marginBottom: 10 }}>
            <input
              type="text"
              autoComplete="name"
              placeholder="As on your ID / bank records"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError("");
              }}
              style={{ ...bareInput, minWidth: 0 }}
            />
          </div>

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            Email *
          </label>
          <div style={{ ...inputRowStyle(fieldErr && !!validateEmail(email)), marginBottom: 10 }}>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              style={{ ...bareInput, minWidth: 0 }}
            />
          </div>

          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
            Occupation
          </label>
          <div style={{ ...inputRowStyle(false), marginBottom: 6 }}>
            <select
              value={occupationId}
              onChange={(e) => {
                setOccupationId(e.target.value);
                if (e.target.value) setCustomOccupation("");
                if (error) setError("");
              }}
              style={{
                ...bareInput,
                cursor: occLoading ? "wait" : "pointer",
                appearance: "none" as const,
              }}
              disabled={occLoading || Boolean(customOccupation.trim())}
            >
              <option value="">{occLoading ? "Loading occupations…" : "Select occupation (optional)"}</option>
              {occupations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.isActive === false ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>
            Or type your own
          </label>
          <div style={{ ...inputRowStyle(false), marginBottom: 4 }}>
            <input
              type="text"
              maxLength={255}
              placeholder="e.g. Freelance designer"
              value={customOccupation}
              onChange={(e) => {
                setCustomOccupation(e.target.value);
                if (e.target.value.trim()) setOccupationId("");
                if (error) setError("");
              }}
              disabled={Boolean(occupationId)}
              style={{ ...bareInput, minWidth: 0 }}
            />
          </div>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 10px", lineHeight: 1.35 }}>
            Choose a configured job, or type your own (shown on your profile like in admin).
          </p>
        </>
      )}

      <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
        Mobile number
      </label>
      <div style={inputRowStyle(fieldErr && !!validatePhone(phone))}>
        <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>+91</span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile number"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          style={bareInput}
        />
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{error}</p>
      )}

      {tab === "signup" && (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 12,
            fontSize: 11,
            color: "#4b5563",
            lineHeight: 1.45,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              if (error) setError("");
            }}
            style={{ marginTop: 2, accentColor: TEAL }}
          />
          <span>
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>
      )}

      <button
        onClick={() => void submit()}
        disabled={loading}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "11px 0",
          borderRadius: 8,
          border: "none",
          background: loading ? "#9ca3af" : TEAL,
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = TEAL_DARK;
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = TEAL;
        }}
      >
        {loading ? (
          <>
            <Spinner /> Sending OTP…
          </>
        ) : (
          "Send OTP"
        )}
      </button>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 14, textAlign: "center" }}>
        By continuing you agree to our Terms of Service and Privacy Policy.
      </p>

      <div id={RECAPTCHA_ID} />
    </div>
  );
}

// ─── Step 2: OTP entry ───────────────────────────────────────────────
function OtpStep({
  phone,
  confirmation,
  signupProfile,
  commitCustomerSession,
  onLogin,
  onNeedsRegistration,
  onChangePhone,
}: {
  phone: string;
  confirmation: ConfirmationResult;
  /** When set, new users complete registration in-modal after OTP. */
  signupProfile: SignupProfilePayload | null;
  commitCustomerSession: (auth: LoginResponse, phoneDigits: string) => void;
  onLogin: (opts?: { registered?: boolean }) => void;
  onNeedsRegistration: (token: string, e164: string) => void;
  onChangePhone: () => void;
}) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_S);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const filled = otp.every((d) => d !== "");

  function change(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    setError("");
    if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  }

  function keyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!otp[i] && i > 0) {
        const next = [...otp];
        next[i - 1] = "";
        setOtp(next);
        refs.current[i - 1]?.focus();
      } else {
        const next = [...otp];
        next[i] = "";
        setOtp(next);
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
    if (e.key === "Enter" && filled) void verify();
  }

  function paste(e: React.ClipboardEvent) {
    e.preventDefault();
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!p) return;
    const next = Array(OTP_LEN).fill("");
    p.split("").forEach((d, idx) => {
      next[idx] = d;
    });
    setOtp(next);
    refs.current[Math.min(p.length, OTP_LEN - 1)]?.focus();
  }

  async function verify() {
    if (!filled) {
      setError("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const cred = await confirmation.confirm(otp.join(""));
      const idToken = await cred.user.getIdToken();
      const res = await authApi.phoneExchange(idToken, "CUSTOMER");
      const e164 = `+91${phone.replace(/\D/g, "").slice(-10)}`;

      if (res.loggedIn && res.auth) {
        commitCustomerSession(res.auth, phone);
        onLogin({ registered: false });
      } else if (res.registrationToken) {
        if (signupProfile?.fullName?.trim() && signupProfile.email?.trim()) {
          try {
            const auth = await authApi.registerCustomerByPhone({
              registrationToken: res.registrationToken,
              fullName: signupProfile.fullName.trim(),
              email: signupProfile.email.trim(),
              occupationId: signupProfile.occupationId,
              customOccupation: signupProfile.customOccupation ?? null,
              state: null,
              district: null,
              areaLocality: null,
              pincode: null,
              latitude: null,
              longitude: null,
              referralCode: null,
            });
            commitCustomerSession(auth, phone);
            onLogin({ registered: true });
          } catch (regErr: unknown) {
            const msg =
              regErr && typeof regErr === "object" && "message" in regErr
                ? String((regErr as { message?: string }).message ?? "")
                : "";
            setError(msg || "Could not complete registration. Try again.");
          }
        } else {
          onNeedsRegistration(res.registrationToken, e164);
        }
      } else {
        setError("Unexpected response from server. Please retry.");
      }
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code.includes("invalid-verification-code")) {
        setError("Incorrect OTP. Please try again.");
      } else if (code.includes("code-expired")) {
        setError("OTP expired. Please request a new one.");
      } else {
        setError(err?.message || "Verification failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#111827",
          margin: "0 0 6px",
          textAlign: "center",
        }}
      >
        OTP Verification
      </h2>
      <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
        Enter the 6-digit code sent to
      </p>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#374151",
          margin: "2px 0 14px",
          textAlign: "center",
        }}
      >
        {maskPhone(phone)}
      </p>

      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          margin: "0 0 14px",
          textAlign: "center",
        }}
      >
        {timer > 0 ? `${mm}:${ss}` : "00:00"}
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 6,
          width: "100%",
          justifyContent: "center",
        }}
        onPaste={paste}
      >
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => change(i, e.target.value)}
            onKeyDown={(e) => keyDown(i, e)}
            style={{
              width: 38,
              height: 42,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 600,
              color: "#111827",
              border: `1.5px solid ${
                digit ? TEAL : error ? "#ef4444" : "#e2e8f0"
              }`,
              borderRadius: 7,
              outline: "none",
              background: "white",
              transition: "all 0.13s",
              fontFamily: "inherit",
              boxShadow: digit ? `0 0 0 3px rgba(13,148,136,0.08)` : "none",
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 11, color: "#ef4444", margin: "6px 0 0" }}>{error}</p>
      )}

      <button
        onClick={() => void verify()}
        disabled={loading || !filled}
        style={{
          width: "100%",
          padding: "10px 0",
          marginTop: 14,
          borderRadius: 8,
          border: "none",
          background: loading || !filled ? "#9ca3af" : TEAL,
          color: "white",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading || !filled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          fontFamily: "inherit",
          boxShadow: `0 3px 12px rgba(13,148,136,0.28)`,
        }}
      >
        {loading ? (
          <>
            <Spinner /> Verifying…
          </>
        ) : (
          "Verify OTP"
        )}
      </button>

      <button
        onClick={onChangePhone}
        style={{
          marginTop: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9ca3af",
          fontSize: 11,
          fontFamily: "inherit",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        ← Change phone number
      </button>
    </div>
  );
}

// ─── Step 3: Success ────────────────────────────────────────────────
function SuccessStep({
  onClose,
  variant = "login",
}: {
  onClose: () => void;
  variant?: "login" | "register";
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 1800);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 0 10px",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background:
            "radial-gradient(at 60% 25%, #1a4a3a 0%, #0e221f 55%, #081812 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          boxShadow: "0 8px 24px rgba(14,34,31,0.28)",
          animation: "auth-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
        {variant === "register" ? "Welcome!" : "Verified!"}
      </h3>
      <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0 }}>
        {variant === "register"
          ? "Your account is ready. Redirecting…"
          : "Login successful. Redirecting…"}
      </p>
    </div>
  );
}

function persistCustomerSession(auth: LoginResponse, phoneDigits: string) {
  localStorage.setItem("p4u_token", auth.accessToken);
  localStorage.setItem("p4u_refresh_token", auth.refreshToken);
  localStorage.setItem("p4u_token_expires_in", String(auth.expiresIn));
  localStorage.setItem("p4u_loggedIn", "true");
  localStorage.setItem("p4u_phone", phoneDigits);
  const customerId =
    auth.customerId != null && String(auth.customerId).trim() !== ""
      ? String(auth.customerId)
      : resolveCustomerIdFromAccessToken(auth.accessToken);
  if (customerId) localStorage.setItem("p4u_customer_id", customerId);
  window.dispatchEvent(new Event("p4u-token-updated"));
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [authTab, setAuthTab] = useState<AuthTab>("signin");
  const [phone, setPhone] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [signupProfile, setSignupProfile] = useState<SignupProfilePayload | null>(null);
  const [successVariant, setSuccessVariant] = useState<"login" | "register">("login");

  const reset = useCallback(() => {
    setStep("phone");
    setAuthTab("signin");
    setPhone("");
    setConfirmation(null);
    setSignupProfile(null);
    setSuccessVariant("login");
    clearRecaptcha();
  }, []);

  const close = useCallback(() => {
    onClose();
    setTimeout(reset, 260);
  }, [onClose, reset]);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      // reCAPTCHA verifier must be torn down whenever the modal closes,
      // otherwise the next open will collide on the same DOM node.
      clearRecaptcha();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-pop  { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes auth-up   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes auth-bg   { from { opacity: 0; } to { opacity: 1; } }
        .auth-overlay { animation: auth-bg 0.2s ease; }
        .auth-card    { animation: auth-up 0.28s ease; }

        .auth-left { display: flex; }
        @media (max-width: 560px) {
          .auth-left  { display: none !important; }
          .auth-card  { max-width: 340px !important; }
          .auth-right { border-radius: 16px !important; }
        }
      `}</style>

      <div
        className="auth-overlay"
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.46)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          className="auth-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 660,
            borderRadius: 16,
            boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)",
            overflow: "hidden",
            minHeight: 430,
          }}
        >
          <div
            className="auth-left"
            style={{
              width: "50%",
              flexShrink: 0,
              background: "#f0f4f8",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}
            >
              <Image
                src={authIllustration}
                alt="Shopping illustration"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
          </div>

          <div
            className="auth-right"
            style={{
              flex: 1,
              background: "white",
              padding: "24px 26px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                marginBottom: 20,
              }}
            >
              <button
                onClick={close}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: 4,
                  borderRadius: 7,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={17} />
              </button>
            </div>

            {step === "phone" && (
              <PhoneStep
                tab={authTab}
                onTabChange={setAuthTab}
                onSent={(p, c, signup) => {
                  setPhone(p);
                  setConfirmation(c);
                  setSignupProfile(signup);
                  setStep("otp");
                }}
              />
            )}
            {step === "otp" && confirmation && (
              <OtpStep
                phone={phone}
                confirmation={confirmation}
                signupProfile={signupProfile}
                commitCustomerSession={persistCustomerSession}
                onLogin={(opts) => {
                  setSuccessVariant(opts?.registered ? "register" : "login");
                  setStep("success");
                  onSuccess?.(phone);
                }}
                onNeedsRegistration={(token, e164) => {
                  sessionStorage.setItem("p4u_register_token", token);
                  sessionStorage.setItem("p4u_register_phone", e164);
                  close();
                  router.push("/register");
                }}
                onChangePhone={() => {
                  clearRecaptcha();
                  setSignupProfile(null);
                  setStep("phone");
                }}
              />
            )}
            {step === "success" && (
              <SuccessStep onClose={close} variant={successVariant} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
