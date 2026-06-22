"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Store, Package, Star, Loader2, Calendar, Clock } from "lucide-react";
import { vendorApi, VendorProfile, VendorOrder } from "@/lib/api/vendor";
import { commerceApi, Booking } from "@/lib/api/commerce";
import AuthGuard from "@/providers/AuthGuard";

type Tab = "profile" | "orders" | "bookings" | "reviews";

export default function VendorPortalPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (tab === "profile") {
      vendorApi
        .getMe()
        .then(setProfile)
        .catch(() => setError("Unable to load vendor profile"))
        .finally(() => setLoading(false));
    } else if (tab === "orders") {
      vendorApi
        .getOrders({ limit: 50 })
        .then((res) => setOrders(res.data))
        .catch(() => setError("Unable to load orders"))
        .finally(() => setLoading(false));
    } else if (tab === "bookings") {
      commerceApi
        .getVendorBookings({ limit: 50 })
        .then((res) => setBookings(res.data))
        .catch(() => setError("Unable to load service bookings"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [tab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <Store className="w-4 h-4" /> },
    { key: "orders", label: "Orders", icon: <Package className="w-4 h-4" /> },
    { key: "bookings", label: "Service Bookings", icon: <Calendar className="w-4 h-4" /> },
    { key: "reviews", label: "Reviews", icon: <Star className="w-4 h-4" /> },
  ];

  const reviewBooking = async (bookingId: string, status: "approved" | "rejected") => {
    try {
      const updated = await commerceApi.updateBookingStatus(bookingId, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)),
      );
    } catch {
      alert(`Failed to ${status} booking`);
    }
  };

  return (
    <AuthGuard>
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Vendor Portal</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition font-medium text-sm ${
                tab === t.key
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {error && <p className="text-center text-red-500 py-10">{error}</p>}

        {/* Profile Tab */}
        {!loading && !error && tab === "profile" && profile && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-4">
              {profile.logo && (
                <img src={profile.logo} alt="" className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <h2 className="text-xl font-bold">{profile.name}</h2>
                {profile.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
                {profile.email && <p className="text-sm text-gray-500">{profile.email}</p>}
              </div>
            </div>
            {profile.description && (
              <p className="text-gray-600">{profile.description}</p>
            )}
            {profile.address && (
              <p className="text-sm text-gray-500">{profile.address}</p>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {!loading && !error && tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 && (
              <p className="text-center text-gray-400 py-20">No orders yet.</p>
            )}
            {orders.map((o) => (
              <div key={o.id} className="p-4 rounded-xl border bg-white flex justify-between items-center">
                <div>
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">&#8377;{o.totalAmount}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : o.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service Bookings Tab */}
        {!loading && !error && tab === "bookings" && (
          <div className="space-y-3">
            {bookings.length === 0 && (
              <p className="text-center text-gray-400 py-20">No service bookings yet.</p>
            )}
            {bookings.map((b) => (
              <div key={b.id} className="p-4 rounded-xl border bg-white flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold">Booking #{b.id}</p>
                  <p className="text-xs text-gray-500">Customer: {b.customerId ?? "—"}</p>
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
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : b.status === "rejected" || b.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {b.status}
                  </span>
                  {b.status === "pending" && (
                    <>
                      <button
                        className="text-xs px-2 py-1 rounded bg-green-600 text-white"
                        onClick={() => void reviewBooking(b.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                        onClick={() => void reviewBooking(b.id, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Tab */}
        {!loading && !error && tab === "reviews" && (
          <p className="text-center text-gray-400 py-20">
            Reviews section coming soon.
          </p>
        )}
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
}
