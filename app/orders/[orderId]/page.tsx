"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Download, Loader2, Package, RotateCcw, Store, Truck } from "lucide-react";
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
  if (normalized === "cancelled" || normalized === "rejected") return "bg-rose-50 text-rose-600";
  if (normalized === "delivered" || normalized === "completed") return "bg-emerald-50 text-emerald-700";
  if (normalized === "created" || normalized === "pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-semibold tracking-wide text-slate-500 uppercase">{children}</h2>;
}

function MetaRow({ label, value, valueClass = "text-slate-900 font-medium" }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-[14px] text-slate-500">{label}</span>
      <span className={`text-right text-[14px] ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params?.orderId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [vendorName, setVendorName] = useState<string>("");
  const [tracking, setTracking] = useState<any>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

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

        const productMap = new Map<
          string,
          { name?: string; image?: string; price?: number; vendorId?: string }
        >();
        await Promise.all(
          productIds.map(async (pid) => {
            try {
              const p: any = await catalogApi.getProduct(pid);
              const price = Number(p?.finalPrice ?? p?.sellPrice ?? p?.price ?? 0);
              productMap.set(pid, {
                name: p?.name || undefined,
                image: pickProductImage(p) || undefined,
                price: Number.isFinite(price) && price > 0 ? price : undefined,
                vendorId: p?.vendorId ? String(p.vendorId) : undefined,
              });
            } catch {
              productMap.set(pid, {});
            }
          }),
        );

        // Vendor display name: prefer the name the pricing step already snapshotted
        // into metadata.totals.vendors[], else resolve the vendor from the catalog.
        // Order/line vendorId can be a business code (VEND…) OR a catalog id; the
        // resolved product's vendorId is guaranteed to match the catalog vendor.
        const totalsVendors = Array.isArray(raw?.metadata?.totals?.vendors)
          ? raw.metadata.totals.vendors
          : [];
        let resolvedVendorName = String(
          totalsVendors[0]?.vendorName || raw?.vendorName || "",
        ).trim();
        if (!resolvedVendorName) {
          const refVendorId = [...productMap.values()].map((x) => x.vendorId).find(Boolean);
          const vid = String(
            refVendorId || raw?.vendorId || baseLines[0]?.vendorId || "",
          ).trim();
          if (vid) {
            try {
              const v: any = await catalogApi.getVendor(vid);
              resolvedVendorName = String(v?.businessName || v?.name || "").trim();
            } catch {
              /* keep empty → falls back to "Seller" */
            }
          }
        }
        setVendorName(resolvedVendorName);

        const normalized: OrderLine[] = baseLines.map((line, idx) => {
          const pid = String(line?.productId || "").trim();
          const ref = productMap.get(pid);
          const rawName = String(
            line?.productName ?? line?.metadata?.productName ?? "",
          ).trim();
          const productName = !isUnsafeProductName(rawName) ? rawName : ref?.name || "Product";
          const qty = Number(line?.quantity || 1);
          // Prefer the price actually charged; fall back to the catalog price so
          // legacy lines saved with unitPrice 0 still show a real amount.
          const lineUnit = Number(line?.unitPrice || line?.price || 0);
          const unitPrice = lineUnit > 0 ? lineUnit : Number(ref?.price || 0);
          const lineRaw = Number(line?.lineTotal || 0);
          const lineTotal = lineRaw > 0 ? lineRaw : unitPrice * qty;
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

  useEffect(() => {
    if (!orderId) return;
    commerceApi.getProductTracking(orderId).then(setTracking).catch(() => setTracking(null));
  }, [orderId, order?.status]);

  async function confirmDelivery() {
    setActionBusy(true); setActionError("");
    try {
      const updated = await commerceApi.confirmProductDelivery(orderId);
      setOrder((current: any) => ({ ...current, ...updated }));
    } catch (e: any) { setActionError(e?.message || "Could not confirm delivery"); }
    finally { setActionBusy(false); }
  }

  async function requestReturn() {
    const reason = window.prompt("Tell us why you are returning this order (minimum 5 characters):")?.trim();
    if (!reason) return;
    setActionBusy(true); setActionError("");
    try {
      await commerceApi.requestProductReturn(orderId, { reason });
      const fresh = await commerceApi.getProductTracking(orderId);
      setTracking(fresh); setOrder((current: any) => ({ ...current, status: "return_requested" }));
    } catch (e: any) { setActionError(e?.message || "Could not request return"); }
    finally { setActionBusy(false); }
  }
  const itemTotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0),
    [lines],
  );
  const total = Number(order?.totalAmount ?? itemTotal);
  const orderStatus = String(order?.status || "created");
  // Never surface a raw vendor code/UUID; resolved async into vendorName above.
  const vendorLabel = vendorName || "Seller";
  const paymentRef = String(order?.paymentRefId || order?.paymentReferenceId || order?.paymentId || "—");

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-[720px] px-4 py-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-full p-2 text-slate-900 hover:bg-white"
              aria-label="Back to orders"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px] font-medium">Orders</span>
            </Link>
            {!loading && !error && lines.length > 0 && (
              <button
                type="button"
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
                className="inline-flex items-center gap-2 text-[14px] font-medium text-teal-700 hover:text-teal-800"
              >
                <Download className="h-4 w-4" /> Invoice
              </button>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          )}
          {error && <p className="py-10 text-center text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200/70">
              {/* Header */}
              <div className="px-6 pb-6 pt-7 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-[24px] font-bold tracking-tight text-slate-950">Order details</h1>
                    <p className="mt-1.5 text-[14px] text-slate-500">{String(order?.orderRef || order?.id || orderId)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${getStatusPillClasses(orderStatus)}`}>
                    {orderStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="mx-6 border-t border-slate-100 sm:mx-8" />

              {/* Delivery */}
              <section className="px-6 py-6 sm:px-8">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <SectionTitle>Delivery & returns</SectionTitle>
                </div>
                <div className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  <MetaRow label="Status" value={<span className="capitalize">{String(tracking?.status || orderStatus).replace(/_/g, " ")}</span>} />
                  <MetaRow label="Shipping" value={<span className="capitalize">{String(tracking?.shippingType || "Not dispatched").replace(/_/g, " ")}</span>} />
                  {tracking?.courierName ? <MetaRow label="Courier" value={tracking.courierName} /> : null}
                  {tracking?.trackingNumber ? <MetaRow label="Tracking / AWB" value={tracking.trackingNumber} /> : null}
                </div>
                {tracking?.trackingUrl ? (
                  <a className="mt-2 inline-block text-[14px] font-medium text-teal-700 hover:underline" href={tracking.trackingUrl} target="_blank" rel="noreferrer">
                    Track with courier
                  </a>
                ) : null}
                {Array.isArray(tracking?.history) && tracking.history.length ? (
                  <ol className="mt-5 space-y-3 border-l border-teal-200/80 pl-4">
                    {tracking.history.map((entry: any, index: number) => (
                      <li key={`${entry.at}-${index}`} className="relative text-[13px]">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                        <strong className="capitalize text-slate-800">{String(entry.status).replace(/_/g, " ")}</strong>
                        <span className="ml-2 text-slate-400">{entry.at ? new Date(entry.at).toLocaleString() : ""}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
                {tracking?.returnRequest ? (
                  <p className="mt-4 text-[14px] text-amber-800">
                    Return: <strong className="capitalize">{String(tracking.returnRequest.status || "requested").replace(/_/g, " ")}</strong>
                    {tracking.returnRequest.refundStatus ? ` · Refund: ${tracking.returnRequest.refundStatus}` : ""}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  {["shipped", "out_for_delivery"].includes(orderStatus.toLowerCase()) ? (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void confirmDelivery()}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm delivery
                    </button>
                  ) : null}
                  {["delivered", "completed"].includes(orderStatus.toLowerCase()) && !tracking?.returnRequest ? (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void requestReturn()}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[14px] font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Request return
                    </button>
                  ) : null}
                </div>
                {actionError ? <p className="mt-3 text-[14px] text-red-600">{actionError}</p> : null}
              </section>

              <div className="mx-6 border-t border-slate-100 sm:mx-8" />

              {/* Seller */}
              <section className="px-6 py-5 sm:px-8">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left transition-colors hover:opacity-80"
                  onClick={() => {
                    /* seller storefront link reserved */
                  }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-900">{vendorLabel}</p>
                    <p className="text-[13px] text-slate-500">View seller products</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
              </section>

              <div className="mx-6 border-t border-slate-100 sm:mx-8" />

              {/* Items */}
              <section className="px-6 py-6 sm:px-8">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-400" />
                  <SectionTitle>Items ({lines.length})</SectionTitle>
                </div>
                <ul className="mt-2 divide-y divide-slate-100">
                  {lines.map((line) => (
                    <li key={line.id} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {line.productImage ? (
                            <img
                              src={resolveMediaUrl(line.productImage) || line.productImage}
                              alt={line.productName}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">{line.productName}</p>
                          <p className="mt-0.5 text-[13px] text-slate-500">
                            Qty {line.quantity} × {inr(line.unitPrice)}
                          </p>
                          <button
                            type="button"
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
                            className="mt-1 text-[12px] font-medium text-teal-700 hover:underline"
                          >
                            Item invoice
                          </button>
                        </div>
                      </div>
                      <p className="shrink-0 text-[15px] font-semibold text-slate-950">{inr(line.lineTotal)}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mx-6 border-t border-slate-100 sm:mx-8" />

              {/* Bill */}
              <section className="px-6 py-6 sm:px-8">
                <SectionTitle>Bill details</SectionTitle>
                <div className="mt-3">
                  <MetaRow label="Item total (MRP)" value={inr(itemTotal)} valueClass="text-slate-800" />
                  <MetaRow label="Delivery fee" value="FREE" valueClass="font-semibold text-emerald-600" />
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <MetaRow label="Grand total" value={inr(total)} valueClass="text-[16px] font-bold text-slate-950" />
                  </div>
                </div>
              </section>

              <div className="mx-6 border-t border-slate-100 sm:mx-8" />

              {/* Order info */}
              <section className="px-6 py-6 sm:px-8">
                <SectionTitle>Order info</SectionTitle>
                <div className="mt-3">
                  <MetaRow label="Order ID" value={String(order?.orderRef || order?.id || orderId)} />
                  <MetaRow
                    label="Placed on"
                    value={order?.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                  />
                  <MetaRow label="Payment" value="Paid" valueClass="font-semibold text-emerald-600" />
                  <MetaRow label="Payment ref" value={paymentRef} />
                </div>
              </section>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
