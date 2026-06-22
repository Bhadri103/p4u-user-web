"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ShoppingBag, Trash2, Bookmark,
  Shield, Check, Eye, Loader2,
} from "lucide-react";
import { useCart } from "@/providers/CartContext";
import { useAuth } from "@/providers/AuthContext";
import { commerceApi, type CartQuoteBreakdown } from "@/lib/api/commerce";
import { paymentsApi } from "@/lib/api/payments";
import type { ApiError } from "@/lib/api/client";
import { useAppLoading } from "@/providers/AppLoadingProvider";
import { resolveMediaUrl } from "@/lib/media";

function messageFromApiError(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as ApiError).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

function isUnauthorizedError(e: unknown): boolean {
  if (typeof e !== "object" || e == null) return false;
  const status = "status" in e ? Number((e as ApiError).status) : 0;
  if (status === 401) return true;
  const msg = "message" in e ? String((e as ApiError).message || "") : "";
  return /unauthorized|invalid or missing token|missing token|invalid token/i.test(msg);
}
 
const PRIMARY_MID  = "#009999";
const TEAL_ACCENT  = "#00b3b3"; // lighter accent for highlights
const BTN_GRAD     = "#009999"; // plain color (no gradient)


function formatPrice(n: number): string {
  return "₹" + Number(n).toLocaleString("en-IN");
}

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function getWeekDays(baseDate: Date): Date[] {
  const d   = new Date(baseDate);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

const TIME_SLOTS = [
  { label: "Morning 9–11 AM",   value: "morning"   },
  { label: "Afternoon 12–3 PM", value: "afternoon" },
  { label: "Evening 4–6 PM",    value: "evening"   },
];
 
interface DisplayItem {
  id: string | number;
  name: string;
  vendor: string;
  color: string;
  price: number;
  originalPrice: number;
  discount: number;
  delivery: string;
  image: string;
  qty: number;
}

interface PaymentMethod {
  id: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  cardIcons?: boolean;
  otherIcons?: boolean;
}
 
function PrimaryBtn({
  children,
  onClick,
  style = {},
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: BTN_GRAD,
        color: "white",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontWeight: 700,
        borderRadius: 10,
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.88"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      onMouseDown={e  => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}
 
function AddressBar({ address, onChangeAddress }: { address: string; onChangeAddress?: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderRadius: 10, padding: "10px 14px", marginBottom: 12,
      border: "1px solid #e5e7eb", background: "white", flexWrap: "wrap", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>Delivered To:</span>
        <span style={{ color: "#6b7280" }}>{address}</span>
      </div>
      <button
        onClick={onChangeAddress}
        style={{
          fontSize: 11, fontWeight: 600, border: "1px solid #d1d5db",
          borderRadius: 6, padding: "4px 10px", background: "white", color: "#374151",
          cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL_ACCENT; e.currentTarget.style.color = TEAL_ACCENT; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#374151"; }}>
        Change
      </button>
    </div>
  );
} 
export default function CartCheckout({
  onBack,
  address = "P4U Complex - 605001",
}: {
  onBack?: () => void;
  address?: string;
}) {
  const { logout } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const { runWithLoading } = useAppLoading();
  const { items: cartItems, removeFromCart, updateQty, clearCart } = useCart();
  const [step, setStep]               = useState<number>(0);
  const [placing, setPlacing]         = useState<boolean>(false);
  const [orderError, setOrderError]   = useState<string | null>(null);
  const [placedAmount, setPlacedAmount] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 10, 11));
  const [weekBase, setWeekBase]       = useState<Date>(new Date(2026, 10, 7));
  const [selectedTime, setSelectedTime] = useState<string>("morning");
  const [redeemInput, setRedeemInput] = useState<string>("");
  const [redeemApplied, setRedeemApplied] = useState<boolean>(false);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [payMethod, setPayMethod]     = useState<string>("card");
  const [cardNum, setCardNum]         = useState<string>("");
  const [cardExp, setCardExp]         = useState<string>("");
  const [cardCvv, setCardCvv]         = useState<string>("");
  const [currentAddress, setCurrentAddress] = useState<string>(address);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [addressInput, setAddressInput] = useState<string>(""); 
  const items: DisplayItem[] = useMemo(() => cartItems.map(i => ({
    id:            i.id,
    name:          i.name,
    vendor:        i.vendor,
    color:         i.color || "",
    price:         i.price,
    originalPrice: i.originalPrice,
    discount:      i.originalPrice > i.price
                     ? Math.round((1 - i.price / i.originalPrice) * 100)
                     : 0,
    delivery:      i.delivery || "Standard delivery",
    image:         resolveMediaUrl(i.imageUrl || i.image) || i.imageUrl || i.image || "",
    qty:           i.qty,
  })), [cartItems]);

  const itemTotal  = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const weekDays   = useMemo(() => getWeekDays(weekBase), [weekBase]);

  /** Server-computed pricing breakdown — refreshed when cart or applied points change. */
  const [quote, setQuote] = useState<CartQuoteBreakdown | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);

  const refreshQuote = useCallback(async (pts: number) => {
    if (cartItems.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      // Sync the cart to server first so the quote sees current contents.
      await commerceApi.updateCart(
        cartItems.map((i) => ({
          productId: i.productId ?? i.id,
          quantity: i.qty,
          unitPrice: i.price,
          vendorId: i.vendorId || null,
          metadata: {
            productName: i.name,
            vendorName: i.vendor,
            ...((i.imageUrl || i.image)
              ? {
                  productImage:
                    resolveMediaUrl(String(i.imageUrl || i.image || "").trim()) || i.imageUrl || i.image,
                }
              : {}),
          },
        })),
      );
      const q = await commerceApi.quoteCart({ redeemPoints: pts });
      setQuote(q);
    } catch (e) {
      setQuoteError(messageFromApiError(e, "Failed to fetch pricing."));
    } finally {
      setQuoteLoading(false);
    }
  }, [cartItems]);

  useEffect(() => {
    refreshQuote(redeemApplied ? redeemPoints : 0);
  }, [refreshQuote, redeemApplied, redeemPoints]);

  const platformFee     = quote ? Number(quote.platformFee) : 0;
  const gstOnFee        = quote ? Number(quote.gstOnPlatformFee) : 0;
  const deliveryFee     = quote ? Number(quote.deliveryFee) : 0;
  const surgeCost       = quote ? Number(quote.surgeCost) : 0;
  const redeemSave      = quote ? Number(quote.pointsRedeemedValue) : 0;
  const total           = quote ? Number(quote.grandTotal) : itemTotal;
  const walletBalance   = quote ? Number(quote.walletBalanceBefore) : 0;
  const maxRedeemValue  = quote ? Number(quote.maxRedeemableValue) : 0;
  const meetsMinCart    = quote ? quote.meetsMinCart : true;
  const minCartValue    = quote ? Number(quote.minCartValue) : 0;

  const scrollToTop = useCallback(() => {
    pageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  async function placeOrder() {
    setPlacing(true);
    setOrderError(null);
    try {
      await runWithLoading(async () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("p4u_token") : null;
        if (!token) {
          setOrderError("Session expired. Please sign in again.");
          window.dispatchEvent(new Event("p4u-open-auth"));
          return;
        }
        // Replace server cart with current UI cart (PUT), then create order from that cart
        if (cartItems.length > 0) {
          await commerceApi.updateCart(
            cartItems.map((i) => ({
              productId: i.productId ?? i.id,
              quantity: i.qty,
              unitPrice: i.price,
              vendorId: i.vendorId || null,
              metadata: {
                productName: i.name,
                vendorName: i.vendor,
                ...((i.imageUrl || i.image)
              ? {
                  productImage:
                    resolveMediaUrl(String(i.imageUrl || i.image || "").trim()) || i.imageUrl || i.image,
                }
              : {}),
              },
            })),
          );
        }

        const order = await commerceApi.createOrderFromCart({
          redeemPoints: redeemApplied ? redeemPoints : 0,
        });

        // For COD, skip payment processing — order is already created
        if (payMethod !== "cod") {
          const intent = await paymentsApi.createIntent({
            orderId: order.id,
            amount: total,
          });

          // Poll for payment status
          let attempts = 0;
          const maxAttempts = 10;
          const pollPayment = async (): Promise<boolean> => {
            attempts++;
            try {
              const status = await paymentsApi.getIntent(intent.id);
              if (status.status === "succeeded" || status.status === "completed") return true;
              if (status.status === "failed" || status.status === "cancelled") return false;
            } catch {
              // continue polling
            }
            if (attempts < maxAttempts) {
              await new Promise((r) => setTimeout(r, 2000));
              return pollPayment();
            }
            return true;
          };

          const paid = await pollPayment();
          if (!paid) {
            setOrderError("Payment was not completed. Please try again.");
            return;
          }
        }

        setPlacedAmount(total);
        clearCart();
        setStep(2);
        scrollToTop();
      });
    } catch (e: unknown) {
      if (isUnauthorizedError(e)) {
        logout();
        setOrderError("Session expired. Please sign in again.");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("p4u-open-auth"));
        }
        return;
      }
      setOrderError(
        messageFromApiError(e, "Failed to place order. Please try again."),
      );
    } finally {
      setPlacing(false);
    }
  }

  function goToStep(n: number) {
    setStep(n);
    scrollToTop();
  }

  function changeQty(id: string | number, delta: number) {
    const item = cartItems.find(i => i.id === id);
    if (item) updateQty(id, Math.max(1, item.qty + delta));
  }

  function removeItem(id: string | number) {
    removeFromCart(id);
  }
 
  const stepLabels = [
    { short: "Cart"    },
    { short: "Payment" },
    { short: "Confirm" },
  ];

  function Stepper() { 
    if (items.length === 0) return null;

    return (
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, padding: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 400 }}>
          {stepLabels.map((s, i) => {
            const done   = step > i;
            const active = step === i;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? "1" : "0 0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: done || active ? BTN_GRAD : "#e5e7eb",
                    color: done || active ? "white" : "#9ca3af",
                    boxShadow: active ? "0 2px 8px rgba(14,34,31,0.4)" : "none",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}>
                    {done ? <Check size={10} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                    color: active ? PRIMARY_MID : done ? "#374151" : "#9ca3af",
                  }}>{s.short}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 6px", marginBottom: 14,
                    background: done ? `linear-gradient(90deg, ${PRIMARY_MID}, ${TEAL_ACCENT})` : "#e5e7eb",
                    borderRadius: 99, transition: "background 0.3s",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  } 
  function Sidebar({ showRedeem = true }: { showRedeem?: boolean }) {
    const breakdownRows: { label: string; val: string; color: string }[] = [
      { label: `Price (${items.length} item${items.length !== 1 ? "s" : ""})`, val: formatPrice(itemTotal), color: "#374151" },
      { label: "Platform Fee", val: formatPrice(platformFee), color: "#374151" },
    ];
    if (gstOnFee > 0) breakdownRows.push({ label: `GST on Platform Fee (${quote?.gstOnPlatformFeePercent ?? 18}%)`, val: formatPrice(gstOnFee), color: "#374151" });
    if (deliveryFee > 0) breakdownRows.push({ label: "Delivery Fee", val: formatPrice(deliveryFee), color: "#374151" });
    if (surgeCost > 0) breakdownRows.push({ label: "Surge Cost", val: formatPrice(surgeCost), color: "#b45309" });
    if (redeemApplied && redeemSave > 0) breakdownRows.push({ label: "Redeem Points", val: `-${formatPrice(redeemSave)}`, color: "#059669" });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {showRedeem && (
          <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>Redeem Points</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                value={redeemInput}
                onChange={e => setRedeemInput(e.target.value)}
                placeholder="Enter Points"
                style={{
                  flex: 1, border: "1px solid #e5e7eb", borderRadius: 8,
                  padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 0,
                }}
              />
              <PrimaryBtn
                onClick={() => {
                  const pts = parseInt(redeemInput) || 0;
                  if (pts > 0) { setRedeemPoints(pts); setRedeemApplied(true); }
                }}
                style={{ padding: "8px 14px", fontSize: 12, borderRadius: 8, flexShrink: 0 }}>
                Apply
              </PrimaryBtn>
            </div>
            {redeemApplied
              ? (
                <p style={{ fontSize: 10, color: "#059669", fontWeight: 500 }}>
                  Applied: {quote?.pointsRedeemed ?? redeemPoints} pts ({formatPrice(redeemSave)} off)
                </p>
              )
              : (
                <p style={{ fontSize: 10, color: TEAL_ACCENT }}>
                  You have {walletBalance} reward points · max redeemable: {formatPrice(maxRedeemValue)} ({quote?.maxRedeemablePercent ?? 0}%)
                </p>
              )
            }
            {quote?.warnings?.length ? (
              <p style={{ fontSize: 10, color: "#b45309", marginTop: 4 }}>{quote.warnings[0]}</p>
            ) : null}
          </div>
        )}

        <div style={{ background: "white", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>
            Price details {quoteLoading && <Loader2 size={12} className="animate-spin" style={{ display: "inline", marginLeft: 6 }} />}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {breakdownRows.map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                <span>{label}</span>
                <span style={{ fontWeight: 600, color }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#111827" }}>
              <span>Total Amount</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          {redeemApplied && redeemSave > 0 && (
            <p style={{ fontSize: 11, fontWeight: 600, marginTop: 8, color: TEAL_ACCENT }}>
              You will save {formatPrice(redeemSave)} on this order
            </p>
          )}
          {!meetsMinCart && (
            <p style={{ fontSize: 11, fontWeight: 600, marginTop: 8, color: "#dc2626" }}>
              Minimum cart value is {formatPrice(minCartValue)}. Add more items to checkout.
            </p>
          )}
          {quoteError && (
            <p style={{ fontSize: 11, fontWeight: 500, marginTop: 8, color: "#dc2626" }}>{quoteError}</p>
          )}
          <PrimaryBtn
            disabled={items.length === 0 || !meetsMinCart || quoteLoading}
            onClick={() => goToStep(Math.min(step + 1, 2))}
            style={{ width: "100%", marginTop: 14, padding: "11px 0", fontSize: 13, borderRadius: 10, display: "block" }}>
            Proceed to Buy
          </PrimaryBtn>
        </div>
      </div>
    );
  }
 
  function Breadcrumb() {
    const crumbs = ["Home", "Cart", "Checkout"];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af", marginBottom: 16, flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={{ color: "#d1d5db" }}>›</span>}
            <span
              style={{
                color: i === crumbs.length - 1 ? "#374151" : undefined,
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
                cursor: i < crumbs.length - 1 ? "pointer" : "default",
              }}
              onMouseEnter={e => { if (i < crumbs.length - 1) (e.target as HTMLElement).style.color = TEAL_ACCENT; }}
              onMouseLeave={e => { if (i < crumbs.length - 1) (e.target as HTMLElement).style.color = ""; }}>
              {c}
            </span>
          </span>
        ))}
      </div>
    );
  }
 
  function CartStep() {
    if (items.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "60px 16px" }}>
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>🛒</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>Your cart is empty</h2>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Add some products to get started!</p>
          <PrimaryBtn onClick={onBack} style={{ padding: "10px 24px", fontSize: 13 }}>
            Continue Shopping
          </PrimaryBtn>
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1f2937", margin: 0 }}>Review Your Order</h1>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              Please verify your order and payment details before completing your purchase.
            </p>
          </div>
          <button
            onClick={() => { if (window.confirm("Remove all items from cart?")) clearCart(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              fontSize: 12, fontWeight: 600, color: "#ef4444", background: "#fef2f2",
              border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; }}
          >
            <Trash2 size={14} /> Remove Cart
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="cart-layout">
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <AddressBar address={currentAddress} onChangeAddress={() => setShowAddressModal(true)} />
            {items.map(item => (
              <div key={item.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid #f3f4f6", flexShrink: 0, background: "#f9fafb" }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📦</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", lineHeight: 1.4, margin: 0, wordBreak: "break-word" }}>{item.name}</p>
                        {item.color && <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>{item.color}</p>}
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>
                          Vendor: <span style={{ fontWeight: 600, color: TEAL_ACCENT }}>{item.vendor}</span>
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{formatPrice(item.price * item.qty)}</p>
                        {item.discount > 0 && (
                          <>
                            <p style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through", margin: "2px 0" }}>{formatPrice(item.originalPrice * item.qty)}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>{item.discount}% Off</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: "#6b7280", margin: "8px 0 2px" }}>
                      Eligible for <span style={{ fontWeight: 600, color: TEAL_ACCENT }}>FREE Shipping.</span>
                    </p>
                    <p style={{ fontSize: 10, color: "#059669", fontWeight: 600, margin: "0 0 8px" }}>{item.delivery}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                        {([
                          { label: "−", action: () => changeQty(item.id, -1) },
                          { label: String(item.qty), action: null as (() => void) | null },
                          { label: "+", action: () => changeQty(item.id, +1) },
                        ]).map((btn, bi) => (
                          <button key={bi} onClick={btn.action ?? undefined}
                            style={{
                              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 700, background: "white",
                              border: "none", borderLeft: bi > 0 ? "1px solid #e5e7eb" : "none",
                              cursor: btn.action ? "pointer" : "default", color: "#374151", fontFamily: "inherit",
                            }}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                      <button
                        style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = TEAL_ACCENT)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#6b7280")}>
                        <Bookmark size={10} /> Save for later
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#9ca3af")}>
                        <Trash2 size={10} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sidebar-col">
            <Sidebar showRedeem={true} />
          </div>
        </div>
      </div>
    );
  }
 
  function PaymentStep() {
    const methods: PaymentMethod[] = [
      {
        id: "razorpay", label: "Razorpay",
        sub: "You will be redirected to the Razorpay website after submitting your order.",
        right: <span style={{ fontSize: 14, fontWeight: 900, color: "#2d6df6", fontFamily: "sans-serif" }}>✦Razorpay</span>,
      },
      { id: "card",  label: "Pay with Credit Card", cardIcons: true },
      { id: "bank",  label: "Direct Bank Transfer",  sub: "Make payment directly through bank account." },
      { id: "other", label: "Other Payment Methods", sub: "Make payment through Gpay, Phonepay, Paytm etc.", otherIcons: true },
      { id: "cod",   label: "Cash on Delivery" },
    ];

    return (
      <div style={{ display: "flex", gap: 16, flexDirection: "column" }} className="cart-layout">
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <AddressBar address={currentAddress} onChangeAddress={() => setShowAddressModal(true)} />
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 14 }}>Payment Method</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {methods.map(pm => (
                <div key={pm.id} onClick={() => setPayMethod(pm.id)}
                  style={{
                    borderRadius: 10, padding: 12, cursor: "pointer",
                    border: `1px solid ${payMethod === pm.id ? PRIMARY_MID : "#e5e7eb"}`,
                    background: payMethod === pm.id ? "#f0fdf4" : "white",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${payMethod === pm.id ? PRIMARY_MID : "#d1d5db"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {payMethod === pm.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: BTN_GRAD }} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1f2937", flex: 1 }}>{pm.label}</span>
                    {pm.right}
                    {pm.cardIcons && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {([ ["#1a1f71","VISA"], ["#f97316","DISC"], ["#eb001b","MC"], ["#ff5f00","MS"] ] as [string,string][]).map(([bg, t], i) => (
                          <div key={i} style={{ width: 30, height: 18, borderRadius: 4, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 6, fontWeight: 900, color: "white" }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pm.otherIcons && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {([ ["#5f259f","P"], ["#00b9f1","N"], ["#4285f4","G"] ] as [string,string][]).map(([bg, t], i) => (
                          <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 8, fontWeight: 900, color: "white" }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {pm.sub && payMethod !== pm.id && (
                    <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4, marginLeft: 26 }}>{pm.sub}</p>
                  )}
                  {pm.id === "card" && payMethod === "card" && (
                    <div style={{ marginTop: 12, marginLeft: 26, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <p style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4 }}>Card number</p>
                        <div style={{ position: "relative" }}>
                          <input value={cardNum} onChange={e => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456"
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 36px 8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                          {cardNum.length >= 16 && (
                            <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: "50%", background: BTN_GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={10} style={{ color: "white" }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <p style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4 }}>Expiration Date</p>
                          <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM/YY"
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <p style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4 }}>Security Code</p>
                          <input value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="•••" type="password"
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Shield size={12} style={{ color: "#9ca3af" }} />
              </div>
              <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
                We protect your payment information using encryption to provide bank-level security.
              </p>
            </div>

            {orderError && (
              <p style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{orderError}</p>
            )}
            <PrimaryBtn onClick={placeOrder} disabled={placing} style={{ width: "100%", marginTop: 14, padding: "12px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {placing ? <><Loader2 size={16} className="animate-spin" /> Placing Order...</> : payMethod === "cod" ? <>Place Order — {formatPrice(total)}</> : <>Pay {formatPrice(total)}</>}
            </PrimaryBtn>
          </div>
        </div>

        <div className="sidebar-col">
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 14 }}>Payment summary</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { label: "Item total",   val: formatPrice(itemTotal),    dash: true },
                { label: "Platform Fee", val: formatPrice(platformFee), dash: true },
                ...(gstOnFee > 0 ? [{ label: `GST (${quote?.gstOnPlatformFeePercent ?? 18}%)`, val: formatPrice(gstOnFee), dash: true }] : []),
                ...(deliveryFee > 0 ? [{ label: "Delivery", val: formatPrice(deliveryFee), dash: true }] : []),
                ...(surgeCost > 0 ? [{ label: "Surge", val: formatPrice(surgeCost), dash: true }] : []),
                ...(redeemSave > 0 ? [{ label: "Points Redeemed", val: `-${formatPrice(redeemSave)}`, dash: true }] : []),
              ] as { label: string; val: string; dash: boolean }[]).map(({ label, val, dash }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280",
                  paddingBottom: 10, borderBottom: dash ? "1px dashed #e5e7eb" : "none",
                }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: "#374151" }}>{val}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#111827" }}>
                <span>Total Amount</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
 
  function SuccessStep() {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", padding: "0 16px" }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", background: BTN_GRAD,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(14,34,31,0.35)",
          }}>
            <Check size={40} style={{ color: "white" }} strokeWidth={2.5} />
          </div>
          <div style={{
            display: "inline-block", padding: "3px 14px", borderRadius: 99, fontSize: 11,
            fontWeight: 600, background: "#f0fdf4", color: "#059669", border: "1px solid #d1fae5", marginBottom: 16,
          }}>
            Order Confirmed
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: "0 0 4px" }}>
            Your order of {formatPrice(placedAmount || itemTotal)}
          </h2>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", margin: "0 0 32px" }}>has been successfully placed!</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onBack ?? (() => goToStep(0))}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
                border: "2px solid #e5e7eb", fontSize: 13, fontWeight: 700, color: "#374151",
                background: "white", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PRIMARY_MID; (e.currentTarget as HTMLElement).style.color = PRIMARY_MID; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}>
              <ShoppingBag size={14} /> Back to Home
            </button>
            <a href="/orders" style={{ textDecoration: "none" }}>
              <PrimaryBtn style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 13 }}>
                <Eye size={14} /> View Order
              </PrimaryBtn>
            </a>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div ref={pageRef} style={{  }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .cart-layout { display: flex; flex-direction: column; gap: 16px; }
        .sidebar-col { width: 100%; }
        @media (min-width: 768px) {
          .cart-layout { flex-direction: row; }
          .sidebar-col { width: 280px; min-width: 280px; flex-shrink: 0; }
        }
        @media (min-width: 1024px) {
          .sidebar-col { width: 300px; min-width: 300px; }
        }
        input:focus {
          border-color: ${TEAL_ACCENT} !important;
          box-shadow: 0 0 0 2px rgba(13,148,136,0.12);
        }
      `}</style>

      {/* ── Address Change Modal ── */}
      {showAddressModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setShowAddressModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", margin: 0 }}>Change Delivery Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, fontSize: 18, lineHeight: 1 }}>
                ✕
              </button>
            </div> 
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved Addresses</p>
            {[
              "P4U Complex - 605001",
              "SF No.250/2 JJ Nagar, Coimbatore - 641016",
            ].map((addr, i) => (
              <div
                key={i}
                onClick={() => { setCurrentAddress(addr); setShowAddressModal(false); }}
                style={{
                  padding: "10px 14px", borderRadius: 10, marginBottom: 8, cursor: "pointer",
                  border: `1px solid ${currentAddress === addr ? PRIMARY_MID : "#e5e7eb"}`,
                  background: currentAddress === addr ? "#f0fdf4" : "white",
                  fontSize: 12, color: "#374151", transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (currentAddress !== addr) e.currentTarget.style.borderColor = TEAL_ACCENT; }}
                onMouseLeave={e => { if (currentAddress !== addr) e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{addr}</span>
                  {currentAddress === addr && <Check size={13} style={{ color: PRIMARY_MID, flexShrink: 0 }} />}
                </div>
              </div>
            ))}
 
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", margin: "14px 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Enter New Address</p>
            <input
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              placeholder="Type your delivery address..."
              style={{
                width: "100%", border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "10px 14px", fontSize: 12, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12,
              }}
            />
            <PrimaryBtn
              disabled={!addressInput.trim()}
              onClick={() => {
                if (addressInput.trim()) {
                  setCurrentAddress(addressInput.trim());
                  setAddressInput("");
                  setShowAddressModal(false);
                }
              }}
              style={{ width: "100%", padding: "10px 0", fontSize: 13 }}>
              Save Address
            </PrimaryBtn>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px" }}>
        {step < 2 && items.length > 0 && <Breadcrumb />}
        {step < 2 && <Stepper />}
        {step === 0 && <CartStep />}
        {step === 1 && <PaymentStep />}
        {step === 2 && <SuccessStep />}
      </div>
    </div>
  );
}