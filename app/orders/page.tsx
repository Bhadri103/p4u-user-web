"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Calendar, Clock, Loader2, Search } from "lucide-react";
import { commerceApi, Order, Booking } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import AuthGuard from "@/providers/AuthGuard";
import { useAuth } from "@/providers/AuthContext";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
import { pickProductImage, pickServiceImage, resolveMediaUrl } from "@/lib/media";
import { isOrderCancellable, isBookingCancellable } from "@/lib/orderCancel";
import { useLocale } from "@/providers/LocaleContext";

type OrdersTab = "products" | "bookings";

type BookingRow = Booking & {
  serviceName: string;
  vendorName: string;
  serviceImage: string;
  totalAmount: number;
};

function looksLikeUuidText(v: unknown): boolean {
  const s = String(v || "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isUnsafeProductName(v: unknown): boolean {
  const s = String(v || "").trim();
  if (!s) return true;
  if (looksLikeUuidText(s)) return true;
  if (/^product\s*#\s*[0-9a-f-]{8,}$/i.test(s)) return true;
  return false;
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "delivered" || s === "completed" || s === "confirmed" || s === "approved") {
    return "bg-green-100 text-green-700";
  }
  if (s === "cancelled" || s === "canceled" || s === "rejected" || s === "disputed") {
    return "bg-red-100 text-red-700";
  }
  return "bg-yellow-100 text-yellow-700";
}

function metaString(meta: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!meta) return "";
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export default function OrdersPage() {
  const { t } = useLocale();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<OrdersTab>("products");
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  function needsPayNow(o: Order): boolean {
    const meta = (o.metadata || {}) as Record<string, unknown>;
    const paymentStatus = String(meta.paymentStatus || "").toLowerCase();
    const paymentMode = String(meta.paymentMode || "").toLowerCase();
    const status = String(o.status || "").toLowerCase();
    if (paymentMode === "cod" || paymentStatus === "cod") return false;
    if (paymentStatus === "paid" || status === "paid") return false;
    return status === "created" || paymentStatus === "pending" || paymentStatus === "failed";
  }

  const payNow = async (orderId: string) => {
    setBusyId(orderId);
    setPayError(null);
    try {
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setPayError("Payment is not configured.");
        return;
      }
      const intent = await commerceApi.createOrderPayment(orderId);
      const providerRef = intent.providerRef || intent.providerOrderId;
      if (!providerRef) throw new Error("Payment provider did not return an order reference.");
      const { loadRazorpay } = await import("@/lib/razorpay");
      const { paymentsApi } = await import("@/lib/api/payments");
      const Rzp = await loadRazorpay();
      await new Promise<void>((resolve, reject) => {
        const rzp = new Rzp({
          key: razorpayKey,
          amount: Math.round(Number(intent.amount) * 100),
          currency: intent.currency || "INR",
          order_id: providerRef,
          name: "Planext4u",
          description: `Order ${orderId}`,
          handler: async (resp: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const result = await paymentsApi.verify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              if (!result.verified) {
                setPayError("Payment could not be verified.");
                reject(new Error("not verified"));
                return;
              }
              commerceApi.invalidateOrdersCache();
              await loadOrders();
              resolve();
            } catch (e) {
              setPayError("Payment verification failed.");
              reject(e instanceof Error ? e : new Error("verify failed"));
            }
          },
          modal: { ondismiss: () => resolve() },
          theme: { color: "#89CFF0" },
        });
        rzp.open();
      });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Unable to start payment");
    } finally {
      setBusyId(null);
    }
  };

  const loadOrders = useCallback(async () => {
    if (!isLoggedIn) {
      setOrdersError("Please log in to view your orders");
      setLoadingOrders(false);
      return;
    }
    const token = localStorage.getItem("p4u_token");
    const fromToken = resolveCustomerIdFromAccessToken(token);
    const customerId = fromToken || localStorage.getItem("p4u_customer_id") || "";
    if (!customerId) {
      setOrdersError("Customer profile not linked. Please log out and log in again.");
      setLoadingOrders(false);
      return;
    }
    if (fromToken) localStorage.setItem("p4u_customer_id", fromToken);

    setLoadingOrders(true);
    try {
      const res = await commerceApi.getOrders(customerId, { limit: 50 }, { forceRefresh: true });
      setOrdersError(null);
      const normalized = res.data.map((o: any) => ({
        ...o,
        items: Array.isArray(o.items)
          ? o.items
          : Array.isArray(o.metadata?.lines)
            ? o.metadata.lines.map((l: any, idx: number) => ({
                id: idx,
                productId: l.productId,
                productName: l.productName ?? `Product #${l.productId}`,
                productImage: l.productImage ?? l.thumbnailUrl ?? l.imageUrl ?? "",
                quantity: l.quantity,
                unitPrice: Number(l.unitPrice || l.price || 0),
                price: Number(l.unitPrice || l.lineTotal || l.price || 0),
              }))
            : [],
      }));
      const productIds = [
        ...new Set(
          normalized
            .flatMap((o: any) => o.items || [])
            .map((i: any) => String(i.productId || "").trim())
            .filter(Boolean),
        ),
      ];
      const productMap = new Map<string, { name?: string; image?: string; price?: number }>();
      await Promise.all(
        productIds.map(async (pid) => {
          try {
            const p: any = await catalogApi.getProduct(pid);
            const price = Number(p?.finalPrice ?? p?.sellPrice ?? p?.price ?? 0);
            productMap.set(pid, {
              name: p?.name || undefined,
              image: pickProductImage(p) || undefined,
              price: Number.isFinite(price) && price > 0 ? price : undefined,
            });
          } catch {
            productMap.set(pid, {});
          }
        }),
      );
      setOrders(
        normalized.map((o: any) => ({
          ...o,
          items: (o.items || []).map((i: any) => {
            const ref = productMap.get(String(i.productId || "").trim());
            const rawName = String(i.productName || "").trim();
            const safeName = !isUnsafeProductName(rawName) ? rawName : ref?.name || "Product";
            const lineUnit = Number(i.unitPrice || i.price || 0);
            const unitPrice = lineUnit > 0 ? lineUnit : Number(ref?.price || 0);
            return {
              ...i,
              productName: safeName,
              productImage: i.productImage || ref?.image || "",
              unitPrice,
              price: unitPrice,
            };
          }),
        })),
      );
    } catch {
      setOrdersError("Unable to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [isLoggedIn]);

  const loadBookings = useCallback(async () => {
    if (!isLoggedIn) {
      setBookingsError("Please log in to view your bookings");
      setLoadingBookings(false);
      return;
    }
    setLoadingBookings(true);
    try {
      const res = await commerceApi.getBookings({ limit: 50 });
      const rows = res.data ?? [];
      setBookingsError(null);

      const vendorIds = [...new Set(rows.map((b) => String(b.vendorId || "").trim()).filter(Boolean))];
      const serviceIds = [...new Set(rows.map((b) => String(b.serviceId || "").trim()).filter(Boolean))];

      const vendorMap = new Map<string, string>();
      const serviceMap = new Map<string, { name: string; image: string }>();

      await Promise.all([
        ...vendorIds.map(async (id) => {
          try {
            const v = await catalogApi.getVendor(id);
            vendorMap.set(id, v?.businessName || v?.name || "Service Vendor");
          } catch {
            vendorMap.set(id, "Service Vendor");
          }
        }),
        ...serviceIds.map(async (id) => {
          try {
            const s = await catalogApi.getService(id);
            serviceMap.set(id, {
              name: s?.name || "Service",
              image: pickServiceImage(s) || "",
            });
          } catch {
            serviceMap.set(id, { name: "Service", image: "" });
          }
        }),
      ]);

      setBookings(
        rows.map((b) => {
          const meta = b.metadata || {};
          const sid = String(b.serviceId || "").trim();
          const vid = String(b.vendorId || "").trim();
          const fromMetaName = metaString(meta, "serviceName", "service_name", "title");
          const fromMetaImage = metaString(meta, "serviceImage", "service_image", "imageUrl", "image");
          const fromMetaVendor = metaString(meta, "vendorName", "vendor_name", "businessName");
          const svc = serviceMap.get(sid);
          const amountRaw =
            (meta as Record<string, unknown>).totalAmount ??
            (meta as Record<string, unknown>).total_amount ??
            (b as any).totalAmount ??
            0;
          return {
            ...b,
            serviceName: fromMetaName || svc?.name || "Service Booking",
            vendorName: fromMetaVendor || vendorMap.get(vid) || "Service Vendor",
            serviceImage: fromMetaImage || svc?.image || "",
            totalAmount: Number(amountRaw) || 0,
          };
        }),
      );
    } catch {
      setBookingsError("Unable to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (authLoading) return;
    void loadOrders();
    void loadBookings();
  }, [authLoading, loadOrders, loadBookings]);

  const cancelOrder = async (id: string) => {
    if (!window.confirm("Cancel this order?")) return;
    setBusyId(id);
    try {
      const updated = await commerceApi.cancelOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
    } catch (e: any) {
      alert(e?.message || "Failed to cancel order");
    } finally {
      setBusyId(null);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    setBusyId(id);
    try {
      const updated = await commerceApi.cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: updated.status, date: updated.date, slot: updated.slot, timeSlot: updated.timeSlot }
            : b,
        ),
      );
    } catch (e: any) {
      alert(e?.message || "Failed to cancel booking");
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const filteredOrders = !q
    ? orders
    : orders.filter((o) => {
        const ref = String((o as any).orderRef || o.id).toLowerCase();
        const names = (o.items || []).map((i: any) => String(i.productName || "").toLowerCase()).join(" ");
        return ref.includes(q) || names.includes(q);
      });
  const filteredBookings = !q
    ? bookings
    : bookings.filter((b) => {
        const hay = `${b.id} ${b.serviceName} ${b.vendorName}`.toLowerCase();
        return hay.includes(q);
      });

  const loading = tab === "products" ? loadingOrders || authLoading : loadingBookings || authLoading;
  const error = tab === "products" ? ordersError : bookingsError;

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#F7FBFF]">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-[1030px] px-4 py-8">
          <div className="mb-8 flex items-center gap-8">
            <button
              type="button"
              onClick={() => window.location.assign("/profile")}
              className="rounded-full p-2 text-neutral-900 hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[24px] font-bold text-neutral-950">{t("orders.title")}</h1>
          </div>

          <div className="mb-6 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex h-[52px] items-center gap-3 rounded-[16px] border border-slate-200 px-4">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[16px] text-slate-700 outline-none placeholder:text-slate-500"
                placeholder={
                  tab === "products"
                    ? "Search by Order ID or Product"
                    : "Search by Booking ID or Service"
                }
              />
            </div>
          </div>

          <div className="mb-5 grid rounded-[18px] bg-slate-100 p-1.5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("products")}
              className={`rounded-[14px] py-3 text-[16px] font-medium ${
                tab === "products" ? "bg-white text-neutral-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Product Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("bookings")}
              className={`rounded-[14px] py-3 text-[16px] font-medium ${
                tab === "bookings" ? "bg-white text-neutral-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Service Bookings ({bookings.length})
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          )}

          {error && <p className="text-center text-red-500 py-10">{error}</p>}

          {!loading && !error && tab === "products" && filteredOrders.length === 0 && (
            <p className="text-center text-gray-400 py-20">{t("orders.none")}</p>
          )}

          {!loading && !error && tab === "bookings" && filteredBookings.length === 0 && (
            <p className="text-center text-gray-400 py-20">No service bookings yet.</p>
          )}

          {tab === "products" && payError && (
            <p className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">{payError}</p>
          )}

          {tab === "products" && !loading && !error && (
            <div className="space-y-0 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200/80">
              {filteredOrders.map((o) => (
                <div key={o.id} className="border-b border-slate-100 p-6 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[17px] font-bold text-neutral-950">
                        {String((o as any).orderRef || o.id)}
                      </p>
                      <p className="mt-1 text-[13px] text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString()} &middot;{" "}
                        {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-4 py-1 text-[13px] font-bold ${statusPillClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {o.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-50">
                            {item.productImage ? (
                              <img
                                src={resolveMediaUrl(item.productImage) || item.productImage}
                                alt={item.productName ?? "Product"}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-neutral-950">
                              {item.productName || "Product"}
                            </p>
                            <p className="mt-1 text-[13px] text-slate-500">
                              Qty: {item.quantity} × &#8377;{Number(item.unitPrice || item.price || 0).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[16px] font-bold text-neutral-950">
                      &#8377;{Number(o.totalAmount || 0).toFixed(0)}
                    </span>
                    <div className="flex items-center gap-3">
                      {needsPayNow(o) && (
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => void payNow(o.id)}
                          className="rounded-full bg-teal-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {busyId === o.id ? "Opening…" : "Pay now"}
                        </button>
                      )}
                      <Link
                        href={`/orders/${encodeURIComponent(String(o.id))}`}
                        className="text-[14px] font-medium text-teal-600 hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>

                  {isOrderCancellable(o.status) && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => void cancelOrder(o.id)}
                      className="mt-3 text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "bookings" && !loading && !error && (
            <div className="space-y-0 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200/80">
              {filteredBookings.map((b) => (
                <div key={b.id} className="border-b border-slate-100 p-6 last:border-b-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-50">
                        {b.serviceImage ? (
                          <img
                            src={resolveMediaUrl(b.serviceImage) || b.serviceImage}
                            alt={b.serviceName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Calendar className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-bold text-neutral-950">{b.serviceName}</p>
                        <p className="mt-1 text-[13px] text-slate-500">{b.vendorName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {b.date ? new Date(b.date).toLocaleDateString() : "—"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {b.slot || b.timeSlot || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-4 py-1 text-[13px] font-bold ${statusPillClass(b.status)}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[16px] font-bold text-neutral-950">
                      {b.totalAmount > 0 ? <>&#8377;{b.totalAmount.toFixed(0)}</> : <span className="text-slate-400 font-medium">—</span>}
                    </span>
                    <Link
                      href="/bookings"
                      className="text-[14px] font-medium text-teal-600 hover:underline"
                    >
                      Manage →
                    </Link>
                  </div>

                  {isBookingCancellable(b.status) && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void cancelBooking(b.id)}
                      className="mt-3 text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
