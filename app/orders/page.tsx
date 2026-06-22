"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Package, Loader2 } from "lucide-react";
import { commerceApi, Order } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import AuthGuard from "@/providers/AuthGuard";
import { useAuth } from "@/providers/AuthContext";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
import { pickProductImage, resolveMediaUrl } from "@/lib/media";
import { downloadOrderInvoice } from "@/lib/invoice";

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
        const productMap = new Map<string, { name?: string; image?: string }>();
        await Promise.all(
          productIds.map(async (pid) => {
            try {
              const p = await catalogApi.getProduct(pid);
              productMap.set(pid, {
                name: p?.name || undefined,
                image: pickProductImage(p as any) || undefined,
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
            return {
              ...i,
              productName: safeName,
              productImage: i.productImage || ref?.image || "",
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="w-6 h-6" /> My Orders
        </h1>

        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {error && <p className="text-center text-red-500 py-10">{error}</p>}

        {!loading && !authLoading && !error && orders.length === 0 && (
          <p className="text-center text-gray-400 py-20">No orders yet.</p>
        )}

        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="p-4 rounded-xl border bg-white"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Order #{String(o.id).slice(0, 8)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(o.createdAt).toLocaleDateString()} &middot;{" "}
                    {o.items.length} item{o.items.length !== 1 ? "s" : ""}
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
                  <button
                    onClick={() =>
                      downloadOrderInvoice(
                        { id: String(o.id), createdAt: o.createdAt, status: o.status, totalAmount: Number(o.totalAmount || 0) },
                        (o.items || []).map((x: any) => ({
                          name: String(x.productName || "Product"),
                          qty: Number(x.quantity || 1),
                          unitPrice: Number(x.unitPrice || x.price || 0),
                          totalPrice: Number(x.unitPrice || x.price || 0) * Number(x.quantity || 1),
                        })),
                        `Order_Invoice_${String(o.id).slice(0, 8)}`,
                      )
                    }
                    className="block ml-auto mt-2 text-xs text-teal-700 hover:underline"
                  >
                    Download Invoice
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {o.items.map((item: any) => (
                  <div key={item.id} className="text-sm flex justify-between items-center text-gray-600 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-md border bg-gray-50 overflow-hidden shrink-0">
                        {item.productImage ? (
                          <img
                            src={resolveMediaUrl(item.productImage) || item.productImage}
                            alt={item.productName ?? "Product"}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-gray-800 font-medium">{item.productName || "Product"}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Link href={`/orders/${encodeURIComponent(String(o.id))}`} className="text-xs text-teal-700 hover:underline">
                            View Details
                          </Link>
                          <button
                            onClick={() =>
                              downloadOrderInvoice(
                                { id: String(o.id), createdAt: o.createdAt, status: o.status },
                                [
                                  {
                                    name: String(item.productName || "Product"),
                                    qty: Number(item.quantity || 1),
                                    unitPrice: Number(item.unitPrice || item.price || 0),
                                    totalPrice: Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1),
                                  },
                                ],
                                `Item_Invoice_${String(o.id).slice(0, 8)}`,
                              )
                            }
                            className="text-xs text-slate-600 hover:underline"
                          >
                            Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0">&#8377;{(Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1)).toFixed(0)}</span>
                  </div>
                ))}
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
