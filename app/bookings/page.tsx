"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { commerceApi, Booking } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import AuthGuard from "@/providers/AuthGuard";

function billFromBooking(b: Booking): {
  amount: number;
  note: string;
  photoUrl: string;
  baseAmount: number;
  acceptedTotal: number;
  status: string;
} | null {
  const meta = b.metadata && typeof b.metadata === "object" ? b.metadata : null;
  const bill = meta && typeof meta.additionalBill === "object" && meta.additionalBill
    ? (meta.additionalBill as Record<string, unknown>)
    : null;
  if (!bill) return null;
  const photos = Array.isArray(bill.photoUrls) ? bill.photoUrls.map(String).filter(Boolean) : [];
  return {
    amount: Number(bill.amount || 0),
    note: typeof bill.note === "string" ? bill.note.trim() : "",
    photoUrl: photos[0] || "",
    baseAmount: Number(bill.baseAmountAtSubmit || 0),
    acceptedTotal: Number(bill.acceptedTotal || 0),
    status: String(bill.status || "").toLowerCase(),
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    commerceApi
      .getBookings({ limit: 50 })
      .then(async (res) => {
        const rows = res.data ?? [];
        setBookings(rows);
        const vendorIds = [...new Set(rows.map((b) => String(b.vendorId || "").trim()).filter(Boolean))];
        const serviceIds = [...new Set(rows.map((b) => String(b.serviceId || "").trim()).filter(Boolean))];
        const [vendors, services] = await Promise.all([
          Promise.all(
            vendorIds.map(async (id) => {
              try {
                const v = await catalogApi.getVendor(id);
                return [id, v?.businessName || v?.name || "Service Vendor"] as const;
              } catch {
                return [id, "Service Vendor"] as const;
              }
            }),
          ),
          Promise.all(
            serviceIds.map(async (id) => {
              try {
                const s = await catalogApi.getService(id);
                return [id, s?.name || "Service"] as const;
              } catch {
                return [id, "Service"] as const;
              }
            }),
          ),
        ]);
        setVendorNames(Object.fromEntries(vendors));
        setServiceNames(Object.fromEntries(services));
      })
      .catch(() => setError("Unable to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const cancelBooking = async (id: string) => {
    try {
      const updated = await commerceApi.cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: updated.status, date: updated.date, slot: updated.slot } : b)),
      );
    } catch {
      alert("Failed to cancel booking");
    }
  };

  const completionOtp = async (id: string) => {
    try {
      const data = await commerceApi.getServiceCompletionOtp(id);
      alert(`Completion OTP: ${data.otp}\nExpires: ${new Date(data.expiresAt).toLocaleTimeString()}`);
    } catch (e: any) {
      alert(e?.message || "OTP is not available");
    }
  };

  const confirmCompletion = async (id: string) => {
    try {
      const updated = await commerceApi.confirmServiceCompletion(id, true);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e: any) {
      alert(e?.message || "Confirmation failed");
    }
  };

  const decideBill = async (id: string, accept: boolean) => {
    let reason: string | undefined;
    if (!accept) {
      reason = prompt("Why are you rejecting this additional bill? (minimum 5 characters)")?.trim();
      if (!reason) return;
    }
    setBusyId(id);
    try {
      const updated = await commerceApi.decideAdditionalBill(id, accept, reason);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e: any) {
      alert(e?.message || "Could not update bill decision");
    } finally {
      setBusyId(null);
    }
  };

  const disputeCompletion = async (id: string, pendingConfirmation = false) => {
    const reason = prompt("Describe the service issue (minimum 5 characters):")?.trim();
    if (!reason) return;
    try {
      if (pendingConfirmation) await commerceApi.confirmServiceCompletion(id, false, reason);
      else await commerceApi.disputeService(id, reason);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "disputed" } : b)));
    } catch (e: any) {
      alert(e?.message || "Dispute could not be opened");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6" /> My Bookings
          </h1>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          )}

          {error && <p className="text-center text-red-500 py-10">{error}</p>}

          {!loading && !error && bookings.length === 0 && (
            <p className="text-center text-gray-400 py-20">No bookings yet.</p>
          )}

          <div className="space-y-3">
            {bookings.map((b) => {
              const bill = billFromBooking(b);
              const busy = busyId === b.id;
              return (
                <div key={b.id} className="rounded-xl border bg-white p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {serviceNames[String(b.serviceId || "").trim()] || "Service Booking"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Vendor: {vendorNames[String(b.vendorId || "").trim()] || "Service Vendor"}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {b.date ? new Date(b.date).toLocaleDateString() : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {b.slot || b.timeSlot}
                        </span>
                      </div>
                      {b.totalAmount != null ? (
                        <p className="mt-2 text-sm font-semibold text-neutral-800">
                          Total: ₹{Number(b.totalAmount || 0).toLocaleString("en-IN")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          b.status === "confirmed" || b.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : b.status === "cancelled" || b.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : b.status === "bill_pending_acceptance"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {String(b.status || "").replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-400">#{String(b.id).slice(0, 8)}</span>
                    </div>
                  </div>

                  {b.status === "bill_pending_acceptance" && bill ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-bold text-amber-950">Additional bill needs your approval</p>
                      <div className="mt-2 grid gap-1 text-sm text-amber-900 sm:grid-cols-3">
                        <p>
                          Base: <strong>₹{bill.baseAmount.toLocaleString("en-IN")}</strong>
                        </p>
                        <p>
                          Extra: <strong>₹{bill.amount.toLocaleString("en-IN")}</strong>
                        </p>
                        <p>
                          New total:{" "}
                          <strong>₹{(bill.baseAmount + bill.amount).toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                      {bill.note ? <p className="mt-2 text-sm text-amber-900">Note: {bill.note}</p> : null}
                      {bill.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bill.photoUrl}
                          alt="Bill"
                          className="mt-2 max-h-36 rounded-lg object-cover ring-1 ring-amber-200"
                        />
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decideBill(b.id, true)}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {busy ? "Saving…" : "Accept bill"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void decideBill(b.id, false)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
                        >
                          Reject bill
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {bill && bill.status === "accepted" ? (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Extra bill accepted (+₹{bill.amount.toLocaleString("en-IN")}
                      {bill.acceptedTotal > 0 ? ` · total ₹${bill.acceptedTotal.toLocaleString("en-IN")}` : ""})
                      {bill.note ? ` · ${bill.note}` : ""}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {b.status === "completion_pending" ? (
                      <button
                        onClick={() => void completionOtp(b.id)}
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
                        Show completion OTP
                      </button>
                    ) : null}
                    {b.status === "completion_pending_confirmation" ? (
                      <>
                        <button
                          onClick={() => void confirmCompletion(b.id)}
                          className="text-xs font-semibold text-green-700 hover:underline"
                        >
                          Confirm service
                        </button>
                        <button
                          onClick={() => void disputeCompletion(b.id, true)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Dispute
                        </button>
                      </>
                    ) : null}
                    {b.status === "completed" ? (
                      <button
                        onClick={() => void disputeCompletion(b.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Report issue
                      </button>
                    ) : null}
                    {![
                      "cancelled",
                      "completed",
                      "completion_pending",
                      "completion_pending_confirmation",
                      "bill_pending_acceptance",
                      "disputed",
                      "rejected",
                    ].includes(b.status) && (
                      <button onClick={() => cancelBooking(b.id)} className="text-xs text-red-500 hover:underline">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
