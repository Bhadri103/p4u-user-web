"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Download, Loader2, Package, Store } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthGuard from "@/providers/AuthGuard";
import { commerceApi } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import { pickProductImage, resolveMediaUrl } from "@/lib/media";
import { downloadOrderInvoice } from "@/lib/invoice";

type OrderLine = {
  id: string | number;
  productId?: string | number;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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

function inr(n: number): string {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function getStatusPillClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "cancelled" || normalized === "rejected") return "bg-rose-100 text-rose-600";
  if (normalized === "delivered" || normalized === "completed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "created" || normalized === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params?.orderId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing");
      setLoading(false);
      return;
    }
    commerceApi
      .getOrder(orderId)
      .then(async (raw: any) => {
        setOrder(raw);
        const baseLines: any[] = Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.metadata?.lines)
            ? raw.metadata.lines
            : [];

        const productIds = [
          ...new Set(
            baseLines
              .map((i) => String(i?.productId || "").trim())
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

        const normalized: OrderLine[] = baseLines.map((line, idx) => {
          const pid = String(line?.productId || "").trim();
          const ref = productMap.get(pid);
          const rawName = String(
            line?.productName ?? line?.metadata?.productName ?? "",
          ).trim();
          const productName = !isUnsafeProductName(rawName) ? rawName : ref?.name || "Product";
          const qty = Number(line?.quantity || 1);
          const unitPrice = Number(line?.unitPrice || line?.price || 0);
          const lineTotal = Number(line?.lineTotal || unitPrice * qty || 0);
          const image =
            line?.productImage ||
            line?.metadata?.productImage ||
            line?.thumbnailUrl ||
            line?.imageUrl ||
            ref?.image ||
            "";
          return {
            id: line?.id ?? idx,
            productId: pid || undefined,
            productName,
            productImage: image,
            quantity: qty,
            unitPrice,
            lineTotal,
          };
        });
        setLines(normalized);
        setError(null);
      })
      .catch(() => setError("Unable to load order details"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const itemTotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0),
    [lines],
  );
  const total = Number(order?.totalAmount ?? itemTotal);
  const orderStatus = String(order?.status || "created");
  const vendorLabel = useMemo(() => {
    const firstLine = (Array.isArray(order?.metadata?.lines) ? order.metadata.lines[0] : null) as any;
    const vendorName = firstLine?.metadata?.vendorName || order?.vendorName || order?.vendorId;
    return String(vendorName || "Unknown vendor");
  }, [order]);
  const paymentRef = String(order?.paymentRefId || order?.paymentReferenceId || order?.paymentId || "—");

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-teal-700 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Orders
            </Link>
            {!loading && !error && lines.length > 0 && (
              <button
                onClick={() =>
                  downloadOrderInvoice(
                    {
                      id: String(order?.id || orderId),
                      createdAt: order?.createdAt,
                      status: order?.status,
                      totalAmount: total,
                      paymentRefId: String(order?.paymentRefId || order?.paymentReferenceId || ""),
                    },
                    lines.map((x) => ({
                      name: x.productName,
                      qty: x.quantity,
                      unitPrice: x.unitPrice,
                      totalPrice: x.lineTotal,
                    })),
                    `Order_Invoice_${String(order?.id || orderId).slice(0, 8)}`,
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-white hover:bg-slate-100"
              >
                <Download className="w-4 h-4" /> Download Invoice
              </button>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          )}
          {error && <p className="text-center text-red-500 py-10">{error}</p>}

          {!loading && !error && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 leading-none">Order Details</h1>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{String(order?.orderRef || order?.id || orderId)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full capitalize font-semibold ${getStatusPillClasses(orderStatus)}`}>
                    {orderStatus}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-teal-700">{vendorLabel}</p>
                      <p className="text-sm text-slate-500">Tap to view seller products</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h2 className="font-bold text-slate-900 mb-4 inline-flex items-center gap-2 text-3xl leading-none">
                  <Package className="w-5 h-5" /> Items ({lines.length})
                </h2>
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div key={line.id} className="flex justify-between items-center gap-3 border rounded-xl p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-md border bg-slate-50 overflow-hidden shrink-0">
                          {line.productImage ? (
                            <img
                              src={resolveMediaUrl(line.productImage) || line.productImage}
                              alt={line.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{line.productName}</p>
                          <p className="text-xs text-slate-500">Qty: {line.quantity} × {inr(line.unitPrice)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-900">{inr(line.lineTotal)}</p>
                        <button
                          onClick={() =>
                            downloadOrderInvoice(
                              {
                                id: String(order?.id || orderId),
                                createdAt: order?.createdAt,
                                status: order?.status,
                              },
                              [
                                {
                                  name: line.productName,
                                  qty: line.quantity,
                                  unitPrice: line.unitPrice,
                                  totalPrice: line.lineTotal,
                                },
                              ],
                              `Item_Invoice_${String(order?.id || orderId).slice(0, 8)}`,
                            )
                          }
                          className="text-xs text-teal-700 hover:underline mt-1 font-medium"
                        >
                          Download Item Invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h2 className="font-bold text-slate-900 mb-3 text-3xl leading-none">Bill Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Item Total (MRP)</span>
                    <span>{inr(itemTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="text-emerald-600 font-semibold">FREE</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-slate-900">
                    <span>Grand Total</span>
                    <span>{inr(total)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h2 className="font-bold text-slate-900 mb-3 text-3xl leading-none">Order Info</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Order ID</span>
                    <span className="text-slate-900 font-medium">{String(order?.orderRef || order?.id || orderId)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Placed on</span>
                    <span className="text-slate-900 font-medium">
                      {order?.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Payment</span>
                    <span className="text-emerald-600 font-semibold">Paid</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Ref ID</span>
                    <span className="text-slate-900 font-medium">{paymentRef}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
