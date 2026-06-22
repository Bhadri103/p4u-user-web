"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthContext";
import { commerceApi, type AvailableSlot } from "@/lib/api/commerce";
import { profileApi, type Address } from "@/lib/api/profile";
import type { ApiError } from "@/lib/api/client";
import { TEAL_GRAD } from "@/app/service/serviceData";

/** Mirrors commerce-management-services booking.service TIME_SLOTS for offline fallback */
const FALLBACK_SLOTS: AvailableSlot[] = [
  { label: "Morning 9-11 AM", value: "09:00-11:00", available: true },
  { label: "Afternoon 12-3 PM", value: "12:00-15:00", available: true },
  { label: "Evening 4-6 PM", value: "16:00-18:00", available: true },
];

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface ServiceBookingModalProps {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  /** Catalog `catalog_service_items.id` when booking a specific service */
  catalogServiceId?: string | null;
  serviceTitle?: string;
  /** Shown as booking amount hint; sent as totalAmount string */
  priceHint?: number;
}

export default function ServiceBookingModal({
  open,
  onClose,
  vendorId,
  catalogServiceId,
  serviceTitle,
  priceHint,
}: ServiceBookingModalProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [date, setDate] = useState(todayYmd());
  const [slots, setSlots] = useState<AvailableSlot[]>(FALLBACK_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotValue, setSlotValue] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setDate(todayYmd());
    setSlotValue("");
    setNotes("");
    setError(null);
    setSlots(FALLBACK_SLOTS);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !isLoggedIn || !vendorId.trim()) return;
    let cancelled = false;
    profileApi
      .getAddresses()
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setAddressId(String(def.id));
        else setAddressId("");
      })
      .catch(() => {
        if (!cancelled) setAddresses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isLoggedIn, vendorId]);

  useEffect(() => {
    if (!open || !isLoggedIn || !vendorId.trim() || !date) return;
    let cancelled = false;
    setSlotsLoading(true);
    commerceApi
      .getAvailableSlots(vendorId, date, catalogServiceId ?? undefined)
      .then((list) => {
        if (cancelled) return;
        const use = Array.isArray(list) ? list : FALLBACK_SLOTS;
        setSlots(use);
        const firstAvail = use.find((s) => s.available !== false);
        setSlotValue((prev) => {
          if (!use.length) return "";
          if (prev && use.some((s) => s.value === prev && s.available !== false)) return prev;
          return firstAvail?.value ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSlots(FALLBACK_SLOTS);
          setSlotValue(FALLBACK_SLOTS[0]?.value ?? "");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isLoggedIn, vendorId, date, catalogServiceId]);

  const totalAmountStr = useMemo(() => {
    if (priceHint != null && Number.isFinite(priceHint) && priceHint > 0) {
      return String(priceHint);
    }
    return "0";
  }, [priceHint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vendorId.trim()) {
      setError("Missing vendor.");
      return;
    }
    if (!date || !slotValue) {
      setError("Please choose a date and time slot.");
      return;
    }
    setSubmitting(true);
    try {
      await commerceApi.createBooking({
        vendorId,
        serviceId: catalogServiceId?.trim() || null,
        date,
        slot: slotValue,
        addressId: addressId.trim() || null,
        notes: notes.trim() || null,
        totalAmount: totalAmountStr,
      });
      onClose();
      router.push("/bookings");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as ApiError).message)
          : "Could not create booking.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.45)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          padding: "22px 20px",
          position: "relative",
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 id="booking-modal-title" style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>
              Book service
            </h2>
            {serviceTitle ? (
              <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0", lineHeight: 1.4 }}>{serviceTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "#374151",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {authLoading ? (
          <p style={{ fontSize: 13, color: "#6b7280" }}>Loading…</p>
        ) : !isLoggedIn ? (
          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 12px" }}>Sign in to book a service. Use <strong>Login</strong> in the header, then try again.</p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                background: TEAL_GRAD,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#b45309",
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            ) : null}

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={date}
              min={todayYmd()}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 14,
                marginBottom: 14,
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              Time slot {slotsLoading ? "(loading…)" : ""}
            </label>
            {slots.length === 0 && !slotsLoading ? (
              <p style={{ fontSize: 12, color: "#b45309", marginBottom: 12 }}>No times are available for this date. Try another day.</p>
            ) : null}
            <select
              value={slotValue}
              onChange={(e) => setSlotValue(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 14,
                boxSizing: "border-box",
                background: "#fff",
              }}
            >
              <option value="">Select a slot</option>
              {slots.map((s) => (
                <option key={s.value} value={s.value} disabled={s.available === false}>
                  {s.label}
                  {s.available === false ? " (full)" : ""}
                </option>
              ))}
            </select>

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              Service address (optional)
            </label>
            <select
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 14,
                boxSizing: "border-box",
                background: "#fff",
              }}
            >
              <option value="">No saved address</option>
              {addresses.map((a) => (
                <option key={String(a.id)} value={String(a.id)}>
                  {(a.label ?? "Address") + ": " + a.line1 + ", " + a.city}
                </option>
              ))}
            </select>
            {addresses.length === 0 ? (
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: -10, marginBottom: 14 }}>
                Add addresses under Profile to attach them to bookings.
              </p>
            ) : null}

            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any details for the provider…"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 16,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !slotValue || slots.length === 0}
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 10,
                  background: submitting ? "#9ca3af" : TEAL_GRAD,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: submitting ? "not-allowed" : "pointer",
                  color: "#fff",
                }}
              >
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
