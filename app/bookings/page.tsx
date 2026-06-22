"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { commerceApi, Booking } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import AuthGuard from "@/providers/AuthGuard";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        prev.map((b) => (b.id === id ? { ...b, status: updated.status, date: updated.date, slot: updated.slot } : b))
      );
    } catch {
      alert("Failed to cancel booking");
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
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl border bg-white flex justify-between items-center gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{serviceNames[String(b.serviceId || "").trim()] || "Service Booking"}</p>
                <p className="text-xs text-gray-500 mt-0.5">Vendor: {vendorNames[String(b.vendorId || "").trim()] || "Service Vendor"}</p>
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
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : b.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {b.status}
                </span>
                <span className="text-[10px] text-gray-400">#{String(b.id).slice(0, 8)}</span>
                {b.status !== "cancelled" && (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
}
