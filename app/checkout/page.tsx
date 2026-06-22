"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CreditCard, Tag, Loader2, ShoppingBag, CheckCircle, XCircle } from "lucide-react";
import { useCart } from "@/providers/CartContext";
import { commerceApi, CheckoutQuote } from "@/lib/api/commerce";
import { paymentsApi } from "@/lib/api/payments";
import { useAuth } from "@/providers/AuthContext";
import type { ApiError } from "@/lib/api/client";
import { useAppLoading } from "@/providers/AppLoadingProvider";

type RazorpayHandlerPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: RazorpayHandlerPayload) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

type RazorpayInstance = { open: () => void };
type RazorpayCtor = new (opts: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<RazorpayCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else reject(new Error("Razorpay SDK failed to load"));
      });
      existing.addEventListener("error", () => reject(new Error("Razorpay SDK failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay SDK failed to load"));
    };
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
}

function messageFromApiError(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as ApiError).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { runWithLoading } = useAppLoading();
  const { isLoggedIn } = useAuth();
  const { items, clearCart } = useCart();
  const [buyNowItem, setBuyNowItem] = useState<any>(null);
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"idle" | "success" | "failed" | "pending">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode !== "buy-now") {
      setBuyNowItem(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem("p4u_buy_now_item");
      const parsed = raw ? JSON.parse(raw) : null;
      setBuyNowItem(parsed && typeof parsed === "object" ? parsed : null);
    } catch {
      setBuyNowItem(null);
    }
  }, [searchParams]);

  const checkoutItems = buyNowItem ? [buyNowItem] : items;
  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);

  const fetchQuote = useCallback(async (discount = couponDiscount) => {
    if (!subtotal) return;
    setLoading(true);
    setError(null);
    try {
      const q = await commerceApi.getCheckoutQuote({
        itemTotal: subtotal,
        discount,
      });
      setQuote(q);
    } catch {
      setError("Unable to fetch quote");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [subtotal, couponDiscount]);

  useEffect(() => {
    if (checkoutItems.length > 0) {
      fetchQuote();
    }
  }, [checkoutItems.length, subtotal]);

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const validation = await commerceApi.validateCoupon(code, subtotal);
      if (!validation.valid) {
        setError(validation.message ?? "Invalid coupon");
        setCouponDiscount(0);
        return;
      }
      const discount = validation.discount ?? 0;
      setCouponDiscount(discount);
      await fetchQuote(discount);
    } catch (e: unknown) {
      const st = typeof e === "object" && e !== null && "status" in e ? (e as ApiError).status : -1;
      setError(st === 401 ? "Sign in to apply coupons." : "Unable to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("p4u_token") : null;
      if (!token) {
        setError("Please sign in to place an order.");
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setError("Payment is not configured. Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.");
        return;
      }

      await runWithLoading(async () => {
        if (checkoutItems.length > 0) {
          await commerceApi.updateCart(
            checkoutItems.map((i) => ({
              productId: i.productId ?? i.id,
              quantity: i.qty,
              unitPrice: i.price,
              vendorId: i.vendorId || null,
            })),
          );
        }
        const order = await commerceApi.createOrderFromCart();
        const amount = quote?.total ?? subtotal;
        const intent = await paymentsApi.createIntent({
          orderId: order.id,
          amount,
        });

        if (!intent.providerRef) {
          throw new Error("Payment provider did not return an order reference.");
        }

        const Rzp = await loadRazorpay();

        // Razorpay expects the amount in subunits (paise).
        const amountSubunits = Math.round(Number(amount) * 100);

        await new Promise<void>((resolve) => {
          const rzp = new Rzp({
            key: razorpayKey,
            amount: amountSubunits,
            currency: intent.currency || "INR",
            order_id: intent.providerRef as string,
            name: "P4U",
            description: `Order ${order.id}`,
            handler: async (resp) => {
              try {
                const result = await paymentsApi.verify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                });
                if (result.verified) {
                  if (!buyNowItem) clearCart();
                  try {
                    sessionStorage.removeItem("p4u_buy_now_item");
                  } catch {
                    // ignore storage errors
                  }
                  setOrderStatus("success");
                } else {
                  setOrderStatus("failed");
                  setError("Payment signature could not be verified.");
                }
              } catch (e) {
                setOrderStatus("failed");
                setError(messageFromApiError(e, "Payment verification failed."));
              } finally {
                resolve();
              }
            },
            modal: {
              ondismiss: () => {
                setOrderStatus("pending");
                setError("Payment was cancelled. The order is still pending and can be paid from My Orders.");
                resolve();
              },
            },
            theme: { color: "#0d9488" },
          });
          rzp.open();
        });
      });
    } catch (e: unknown) {
      setError(messageFromApiError(e, "Failed to place order. Please try again."));
    } finally {
      setPlacing(false);
    }
  };

  if (orderStatus === "success") {
    return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Order Placed!</h2>
            <p className="text-gray-500">Thank you for your purchase. Payment completed successfully.</p>
            <div className="flex gap-3 mt-4">
              <a href="/orders" className="px-6 py-2 rounded-xl border border-teal-600 text-teal-600 font-medium">
                View Orders
              </a>
              <a href="/" className="px-6 py-2 rounded-xl bg-teal-600 text-white font-medium">
                Continue Shopping
              </a>
            </div>
          </main>
          <Footer />
        </div>
    );
  }

  if (orderStatus === "failed" || orderStatus === "pending") {
    const isPending = orderStatus === "pending";
    return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPending ? "bg-yellow-100" : "bg-red-100"}`}>
              <XCircle className={`w-8 h-8 ${isPending ? "text-yellow-600" : "text-red-600"}`} />
            </div>
            <h2 className="text-2xl font-bold">{isPending ? "Payment Pending" : "Payment Failed"}</h2>
            <p className="text-gray-500 text-center max-w-md">
              {error ?? (isPending ? "Your order was created. Complete the payment from My Orders." : "Payment could not be completed.")}
            </p>
            <div className="flex gap-3 mt-4">
              <a href="/orders" className="px-6 py-2 rounded-xl bg-teal-600 text-white font-medium">
                View Orders
              </a>
            </div>
          </main>
          <Footer />
        </div>
    );
  }

  return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Checkout</h1>

          {!isLoggedIn && checkoutItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Sign in to complete payment.{" "}
              <button
                type="button"
                className="font-semibold text-teal-800 underline"
                onClick={() => window.dispatchEvent(new CustomEvent("p4u-open-auth"))}
              >
                Sign in
              </button>
            </div>
          )}

          {checkoutItems.length === 0 ? (
            <p className="text-center text-gray-400 py-20">Your cart is empty.</p>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Order Summary
                </h2>
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.qty}
                    </span>
                    <span>&#8377;{item.price * item.qty}</span>
                  </div>
                ))}
                <hr />
                <div className="flex justify-between font-bold">
                  <span>Subtotal</span>
                  <span>&#8377;{subtotal}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <h2 className="font-semibold flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5" /> Coupon Code
                </h2>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Enter coupon code (optional)"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={loading}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
              </div>

              {quote && (
                <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>&#8377;{quote.itemTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform fee</span>
                    <span>&#8377;{quote.platformFee}</span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-&#8377;{quote.discount}</span>
                    </div>
                  )}
                  <hr />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>&#8377;{quote.total}</span>
                  </div>
                  {quote.currency && (
                    <p className="text-xs text-gray-400">Currency: {quote.currency}</p>
                  )}
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="button"
                onClick={placeOrder}
                disabled={placing || !isLoggedIn}
                className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
                {!isLoggedIn
                  ? "Sign in to pay"
                  : placing
                    ? "Placing Order..."
                    : `Pay ₹${quote?.total ?? subtotal}`}
              </button>
            </div>
          )}
        </main>
        <Footer />
      </div>
  );
}
