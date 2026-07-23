"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Calendar, Loader2, Search } from "lucide-react";
import { commerceApi, Order } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import AuthGuard from "@/providers/AuthGuard";
import { useAuth } from "@/providers/AuthContext";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
import { pickProductImage, resolveMediaUrl } from "@/lib/media";

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

export default function OrdersPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setError("Please log in to view your orders");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("p4u_token");
    const customerId =
      localStorage.getItem("p4u_customer_id") || resolveCustomerIdFromAccessToken(token) || "";
    if (!customerId) {
      setError("Customer profile not linked. Please log out and log in again.");
      setLoading(false);
      return;
    }
    if (!localStorage.getItem("p4u_customer_id")) {
      localStorage.setItem("p4u_customer_id", customerId);
    }
    commerceApi
      .getOrders(customerId, { limit: 50 })
      .then(async (res) => {
        setError(null);
        // Backend stores line items in metadata.lines, map them to the items field
        const normalized = res.data.map((o: any) => ({
          ...o,
          items: Array.isArray(o.items) ? o.items
            : Array.isArray(o.metadata?.lines) ? o.metadata.lines.map((l: any, idx: number) => ({
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
        const withDetails = normalized.map((o: any) => ({
          ...o,
          items: (o.items || []).map((i: any) => {
            const ref = productMap.get(String(i.productId || "").trim());
            const fallbackName = ref?.name || "";
            const rawName = String(i.productName || "").trim();
            const safeName = !isUnsafeProductName(rawName) ? rawName : fallbackName || "Product";
            // Fall back to catalog price when the saved line price is 0/missing.
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
        }));
        setOrders(withDetails);
      })
      .catch(() => setError("Unable to load orders"))
      .finally(() => setLoading(false));
  }, [isLoggedIn, authLoading]);

  const cancelOrder = async (id: string) => {
    try {
      const updated = await commerceApi.cancelOrder(id);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o))
      );
    } catch {
      alert("Failed to cancel order");
    }
  };

  return (
    <AuthGuard>
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[1030px] px-4 py-8">
        <div className="mb-8 flex items-center gap-8">
          <button type="button" onClick={() => window.location.assign("/profile")} className="rounded-full p-2 text-slate-900 hover:bg-slate-100" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[24px] font-bold text-slate-950">My Orders</h1>
        </div>

        <div className="mb-6 rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="flex h-[52px] items-center gap-3 rounded-[16px] border border-slate-200 px-4">
              <Search className="h-5 w-5 text-slate-500" />
              <input className="min-w-0 flex-1 bg-transparent text-[16px] text-slate-700 outline-none placeholder:text-slate-500" placeholder="Search by Order ID or Product" />
            </div>
            <div className="flex h-[52px] items-center gap-3 rounded-[16px] border border-slate-200 px-4 text-[16px] text-slate-950">
              <Calendar className="h-5 w-5 text-slate-500" />
              <span>dd-mm-yy</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[15px] text-slate-500">to</span>
              <div className="flex h-[52px] items-center rounded-[16px] border border-slate-200 px-4 text-[16px] text-slate-950">dd-mm-yy</div>
            </div>
          </div>
        </div>

        <div className="mb-5 grid rounded-[18px] bg-slate-100 p-1.5 md:grid-cols-2">
          <button type="button" className="rounded-[14px] bg-white py-3 text-[16px] font-medium text-slate-950 shadow-sm">
            Product Orders ({orders.length})
          </button>
          <button type="button" className="rounded-[14px] py-3 text-[16px] font-medium text-slate-500">
            Service Bookings (0)
          </button>
        </div>

        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {error && <p className="text-center text-red-500 py-10">{error}</p>}

        {!loading && !authLoading && !error && orders.length === 0 && (
          <p className="text-center text-gray-400 py-20">No orders yet.</p>
        )}

        <div className="space-y-0 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200/80">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border-b border-slate-100 p-6 last:border-b-0"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[17px] font-bold text-slate-950">{String((o as any).orderRef || o.id)}</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString()} &middot;{" "}
                    {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-full px-4 py-1 text-[13px] font-bold ${
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
                        <p className="truncate text-[15px] font-semibold text-slate-950">{item.productName || "Product"}</p>
                        <p className="mt-1 text-[13px] text-slate-500">Qty: {item.quantity} × &#8377;{Number(item.unitPrice || item.price || 0).toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[16px] font-bold text-slate-950">&#8377;{Number(o.totalAmount || 0).toFixed(0)}</span>
                <Link href={`/orders/${encodeURIComponent(String(o.id))}`} className="text-[14px] font-medium text-teal-600 hover:underline">
                  View Details →
                </Link>
              </div>

              {o.status !== "delivered" && o.status !== "cancelled" && (
                <button
                  onClick={() => cancelOrder(o.id)}
                  className="mt-3 text-xs text-red-500 hover:underline"
                >
                  Cancel Order
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
    </AuthGuard>
  );
}
