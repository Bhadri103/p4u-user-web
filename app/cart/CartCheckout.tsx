"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, ShoppingBag, Trash2,
  Check, Eye, Loader2, Clock, Calendar, MapPin, Heart,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/providers/CartContext";
import { useAuth } from "@/providers/AuthContext";
import { formatAddress, useAddresses } from "@/providers/AddressContext";
import { commerceApi, type CartQuoteBreakdown } from "@/lib/api/commerce";
import { paymentsApi } from "@/lib/api/payments";
import type { ApiError } from "@/lib/api/client";
import { useAppLoading } from "@/providers/AppLoadingProvider";
import { resolveMediaUrl } from "@/lib/media";
import { loadRazorpay } from "@/lib/razorpay";
import PurchaseActionButton from "@/components/shop/PurchaseActionButton";

function shippingSnapshotFromAddress(address: {
  id: string | number;
  label?: string;
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}) {
  return {
    id: String(address.id),
    label: address.label || null,
    fullName: address.fullName || null,
    phone: address.phone || null,
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || "IN",
  };
}

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
 
const PRIMARY_MID  = "#89CFF0";
const TEAL_ACCENT  = "#89CFF0";
const BTN_GRAD     = "#89CFF0";


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
      className="cart-primary-button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: BTN_GRAD,
        color: "#FFFFFF",
        border: "1px solid #89CFF0",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        borderRadius: 12,
        boxShadow: "0 8px 20px rgba(137,207,240, 0.18)",
        transition: "opacity 0.18s, transform 0.18s, box-shadow 0.18s",
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
 
const SAVED_CART_KEY = "p4u_cart_saved";

type SavedCartLine = {
  id: string | number;
  productId?: string | number;
  name: string;
  vendor: string;
  vendorId?: string;
  price: number;
  originalPrice: number;
  image?: string;
  qty: number;
};

function loadSavedCart(): SavedCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_CART_KEY);
    return raw ? (JSON.parse(raw) as SavedCartLine[]) : [];
  } catch {
    return [];
  }
}

function persistSavedCart(rows: SavedCartLine[]) {
  try {
    localStorage.setItem(SAVED_CART_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

function AddressBar({
  address,
  empty,
  onChangeAddress,
}: {
  address: string;
  empty?: boolean;
  onChangeAddress?: () => void;
}) {
  return (
    <div className="cart-panel cart-address-panel" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderRadius: 14, padding: "14px 16px",
      border: "1px solid #D7E7F5", background: "white", flexWrap: "wrap", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
        <MapPin size={18} style={{ color: PRIMARY_MID, flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>Deliver To</p>
          <p style={{ fontSize: 12, color: empty ? "#94a3b8" : "#5D757A", margin: "4px 0 0", wordBreak: "break-word" }}>
            {empty ? "No address selected" : address}
          </p>
        </div>
      </div>
      <button
        className="cart-secondary-button"
        type="button"
        onClick={onChangeAddress}
        style={{
          fontSize: 12, fontWeight: 600, border: "1px solid #89CFF0",
          borderRadius: 10, padding: "8px 16px", background: "#FFFFFF", color: PRIMARY_MID,
          cursor: "pointer", fontFamily: "inherit",
        }}>
        {empty ? "Add" : "Change"}
      </button>
    </div>
  );
} 
export default function CartCheckout({
  onBack,
  address = "",
}: {
  onBack?: () => void;
  address?: string;
}) {
  const { logout } = useAuth();
  const { addresses, selectedAddress, selectedAddressId, isLoading: addressesLoading, error: addressError, selectAddress } = useAddresses();
  const pageRef = useRef<HTMLDivElement>(null);
  const { runWithLoading } = useAppLoading();
  const { items: cartItems, removeFromCart, updateQty, clearCart, addToCart } = useCart();
  const [step, setStep]               = useState<number>(0);
  const [placing, setPlacing]         = useState<boolean>(false);
  const [orderError, setOrderError]   = useState<string | null>(null);
  const [placedAmount, setPlacedAmount] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [weekBase, setWeekBase]       = useState<Date>(() => new Date());
  const [selectedTime, setSelectedTime] = useState<string>("morning");
  const [deliveryMode, setDeliveryMode] = useState<"anytime" | "schedule">("anytime");
  const [cartTab, setCartTab] = useState<"shop" | "saved">("shop");
  const [savedItems, setSavedItems] = useState<SavedCartLine[]>([]);
  const [redeemInput, setRedeemInput] = useState<string>("");
  const [redeemApplied, setRedeemApplied] = useState<boolean>(false);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [couponInput, setCouponInput] = useState<string>("");
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [payMethod, setPayMethod]     = useState<string>("cod");
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const currentAddress = selectedAddress ? formatAddress(selectedAddress) : address || "No address selected";
  const addressEmpty = !selectedAddress;

  useEffect(() => {
    setSavedItems(loadSavedCart());
  }, []);

  const syncSaved = useCallback((rows: SavedCartLine[]) => {
    setSavedItems(rows);
    persistSavedCart(rows);
  }, []);  const items: DisplayItem[] = useMemo(() => cartItems.map(i => ({
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

  const refreshQuote = useCallback(async (pts: number, coupon?: string) => {
    if (cartItems.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
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
      const q = await commerceApi.quoteCart({
        redeemPoints: pts,
        ...(coupon ? { couponCode: coupon } : {}),
      });
      setQuote(q);
      if (q.warnings?.length) {
        const couponWarn = q.warnings.find((w) => /coupon/i.test(w));
        if (couponWarn) setCouponError(couponWarn);
      }
    } catch (e) {
      setQuoteError(messageFromApiError(e, "Failed to fetch pricing."));
    } finally {
      setQuoteLoading(false);
    }
  }, [cartItems]);

  useEffect(() => {
    refreshQuote(redeemApplied ? redeemPoints : 0, couponCode || undefined);
  }, [refreshQuote, redeemApplied, redeemPoints, couponCode]);

  const platformFee     = quote ? Number(quote.platformFee) : 0;
  const gstOnFee        = quote ? Number(quote.gstOnPlatformFee) : 0;
  const deliveryFee     = quote ? Number(quote.deliveryFee) : 0;
  const surgeCost       = quote ? Number(quote.surgeCost) : 0;
  const redeemSave      = quote ? Number(quote.pointsRedeemedValue) : 0;
  const couponDiscount  = quote ? Number(quote.discount) : 0;
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
        if (!selectedAddress || !selectedAddressId) {
          setOrderError("Select a delivery address before placing the order.");
          setShowAddressModal(true);
          return;
        }
        if (!meetsMinCart) {
          setOrderError(`Cart subtotal is below the minimum of ${formatPrice(minCartValue)}.`);
          return;
        }
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

        const paymentMode = payMethod === "cod" ? "cod" : "razorpay";
        if (paymentMode !== "cod") {
          const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
          if (!razorpayKey) {
            setOrderError("Payment is not configured. Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.");
            return;
          }
        }

        const deliverySchedule =
          deliveryMode === "schedule"
            ? {
                mode: "schedule",
                date: selectedDate.toISOString().slice(0, 10),
                slot: selectedTime || undefined,
              }
            : { mode: "anytime" };

        const order = await commerceApi.createOrderFromCart({
          redeemPoints: redeemApplied ? redeemPoints : 0,
          couponCode: couponCode || undefined,
          addressId: String(selectedAddressId),
          shippingAddress: shippingSnapshotFromAddress(selectedAddress),
          paymentMode,
          deliverySchedule,
        });

        if (paymentMode === "cod") {
          setPlacedAmount(total);
          await clearCart();
          commerceApi.invalidateOrdersCache();
          setStep(2);
          scrollToTop();
          return;
        }

        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;
        const payAmount = Number(
          (order as { orders?: { totalAmount?: number }[] }).orders?.reduce(
            (s, o) => s + Number(o.totalAmount || 0),
            0,
          ) || order.totalAmount || total,
        );
        const intent = await paymentsApi.createIntent({
          orderId: order.id,
          amount: payAmount,
          metadata: {
            orderType: "product",
            domain: "product",
            productOrderId: String(order.id),
            orderRef: order.orderRef || order.id,
            siblingOrderIds: (order as { orders?: { id: string }[] }).orders
              ?.map((o) => o.id)
              .filter((id) => id !== order.id),
          },
        });
        if (!intent.providerRef) {
          throw new Error("Payment provider did not return an order reference.");
        }

        const Rzp = await loadRazorpay();
        const amountSubunits = Math.round(Number(payAmount) * 100);
        await new Promise<void>((resolve, reject) => {
          const rzp = new Rzp({
            key: razorpayKey,
            amount: amountSubunits,
            currency: intent.currency || "INR",
            order_id: intent.providerRef as string,
            name: "Planext4u",
            description: `Order ${order.orderRef || order.id}`,
            handler: async (resp) => {
              try {
                const result = await paymentsApi.verify({
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                });
                if (!result.verified) {
                  setOrderError("Payment signature could not be verified.");
                  reject(new Error("Payment not verified"));
                  return;
                }
                setPlacedAmount(payAmount);
                await clearCart();
                commerceApi.invalidateOrdersCache();
                setStep(2);
                scrollToTop();
                resolve();
              } catch (e) {
                setOrderError(messageFromApiError(e, "Payment verification failed."));
                reject(e instanceof Error ? e : new Error("Payment verification failed"));
              }
            },
            modal: {
              ondismiss: () => {
                setOrderError(
                  "Payment was cancelled. Your order is pending payment — use Pay now on My Orders.",
                );
                commerceApi.invalidateOrdersCache();
                resolve();
              },
            },
            theme: { color: "#89CFF0" },
          });
          rzp.open();
        });
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

  function saveForLater(id: string | number) {
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;
    const line: SavedCartLine = {
      id: item.productId ?? item.id,
      productId: item.productId ?? item.id,
      name: item.name,
      vendor: item.vendor,
      vendorId: item.vendorId,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.imageUrl || item.image,
      qty: item.qty,
    };
    const next = [line, ...savedItems.filter((s) => String(s.productId ?? s.id) !== String(line.productId))];
    syncSaved(next);
    removeFromCart(id);
    setCartTab("saved");
  }

  function moveSavedToCart(line: SavedCartLine) {
    addToCart({
      id: line.productId ?? line.id,
      productId: line.productId ?? line.id,
      name: line.name,
      price: line.price,
      originalPrice: line.originalPrice,
      vendor: line.vendor,
      vendorId: line.vendorId || "",
      image: line.image,
      qty: line.qty,
    });
    syncSaved(savedItems.filter((s) => String(s.productId ?? s.id) !== String(line.productId ?? line.id)));
    setCartTab("shop");
  }

  function removeSaved(line: SavedCartLine) {
    syncSaved(savedItems.filter((s) => String(s.productId ?? s.id) !== String(line.productId ?? line.id)));
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
                    fontSize: 10, fontWeight: 600,
                    background: done || active ? BTN_GRAD : "#D7E7F5",
                    color: done || active ? "#202124" : "#5D757A",
                    boxShadow: active ? "0 2px 8px rgba(14,34,31,0.4)" : "none",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}>
                    {done ? <Check size={10} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                    color: active ? PRIMARY_MID : done ? "#202124" : "#5D757A",
                  }}>{s.short}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: "0 6px", marginBottom: 14,
                    background: done ? `linear-gradient(90deg, ${PRIMARY_MID}, ${TEAL_ACCENT})` : "#D7E7F5",
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
      { label: "Item Total (MRP)", val: formatPrice(itemTotal), color: "#202124" },
      { label: "Subtotal", val: formatPrice(Math.max(0, itemTotal - (redeemApplied ? redeemSave : 0) - couponDiscount)), color: "#202124" },
    ];
    if (platformFee > 0) breakdownRows.push({ label: "Platform Fee", val: formatPrice(platformFee), color: "#202124" });
    if (gstOnFee > 0) breakdownRows.push({ label: `GST on Platform Fee (${quote?.gstOnPlatformFeePercent ?? 18}%)`, val: formatPrice(gstOnFee), color: "#202124" });
    if (deliveryFee > 0) breakdownRows.push({ label: "Delivery Fee", val: formatPrice(deliveryFee), color: "#202124" });
    if (surgeCost > 0) breakdownRows.push({ label: "Surge Cost", val: formatPrice(surgeCost), color: "#202124" });
    if (redeemApplied && redeemSave > 0) breakdownRows.push({ label: "Redeem Points", val: `-${formatPrice(redeemSave)}`, color: "#89CFF0" });
    if (couponDiscount > 0) breakdownRows.push({ label: couponCode ? `Coupon (${couponCode})` : "Coupon", val: `-${formatPrice(couponDiscount)}`, color: "#89CFF0" });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="cart-sidebar-card" style={{ background: "white", borderRadius: 10, border: "1px solid #D7E7F5", padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", marginBottom: 12 }}>Coupon</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              value={couponInput}
              onChange={e => setCouponInput(e.target.value)}
              placeholder="Enter coupon code"
              style={{
                flex: 1, border: "1px solid #D7E7F5", borderRadius: 8,
                padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 0,
              }}
            />
            <PrimaryBtn
              onClick={async () => {
                const code = couponInput.trim();
                setCouponError(null);
                if (!code) {
                  setCouponCode("");
                  return;
                }
                try {
                  const validation = await commerceApi.validateCoupon(code, itemTotal);
                  if (!validation.valid) {
                    setCouponError(validation.message || "Invalid coupon");
                    setCouponCode("");
                    return;
                  }
                  setCouponCode(code);
                  await refreshQuote(redeemApplied ? redeemPoints : 0, code);
                } catch (e) {
                  setCouponError(messageFromApiError(e, "Unable to validate coupon"));
                  setCouponCode("");
                }
              }}
              style={{ padding: "8px 14px", fontSize: 12, borderRadius: 8, flexShrink: 0 }}>
              Apply
            </PrimaryBtn>
          </div>
          {couponCode && couponDiscount > 0 && (
            <p style={{ fontSize: 11, color: "#89CFF0", margin: 0 }}>
              Applied {couponCode}: −{formatPrice(couponDiscount)}
            </p>
          )}
          {couponError && (
            <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>{couponError}</p>
          )}
          <Link href="/profile" style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 600, color: PRIMARY_MID, textDecoration: "none" }}>
            View My Coupons
          </Link>
        </div>
        {showRedeem && (
          <div className="cart-sidebar-card" style={{ background: "white", borderRadius: 10, border: "1px solid #D7E7F5", padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", marginBottom: 12 }}>Redeem Points</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                value={redeemInput}
                onChange={e => setRedeemInput(e.target.value)}
                placeholder={`Enter Points (max ${Math.max(1, Math.round(maxRedeemValue) || 8)})`}
                style={{
                  flex: 1, border: "1px solid #D7E7F5", borderRadius: 8,
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
                <p style={{ fontSize: 10, color: "#89CFF0", fontWeight: 500 }}>
                  Applied: {quote?.pointsRedeemed ?? redeemPoints} pts ({formatPrice(redeemSave)} off)
                </p>
              )
              : (
                <p style={{ fontSize: 10, color: TEAL_ACCENT }}>
                  Wallet: {walletBalance} pts · Max redeemable: {formatPrice(maxRedeemValue)} · Min: 1 pt
                </p>
              )
            }
            {quote?.warnings?.length ? (
              <p style={{ fontSize: 10, color: "#202124", marginTop: 4 }}>{quote.warnings[0]}</p>
            ) : null}
          </div>
        )}

        <div className="cart-sidebar-card cart-summary-card" style={{ background: "white", borderRadius: 10, border: "1px solid #D7E7F5", padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", marginBottom: 12 }}>
            Bill Details {quoteLoading && <Loader2 size={12} className="animate-spin" style={{ display: "inline", marginLeft: 6 }} />}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {breakdownRows.map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5D757A" }}>
                <span>{label}</span>
                <span style={{ fontWeight: 600, color }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #F7FBFF", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, color: PRIMARY_MID }}>
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
          <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #D7E7F5", padding: 12, marginTop: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#3F3F46", margin: "0 0 6px" }}>
              Review your order and address details to avoid cancellations.
            </p>
            <p style={{ fontSize: 11, color: "#5D757A", margin: 0, lineHeight: 1.45 }}>
              You can only cancel the order until it is accepted by the vendor. Late cancellations may deduct amount, and redeemed wallet points are not refundable.
            </p>
          </div>
          <PrimaryBtn
            disabled={items.length === 0 || !meetsMinCart || quoteLoading}
            onClick={() => goToStep(Math.min(step + 1, 2))}
            style={{ width: "100%", marginTop: 14, padding: "14px 0", fontSize: 15, borderRadius: 12, display: "block", fontWeight: 600 }}>
            Proceed To Checkout
          </PrimaryBtn>
        </div>
      </div>
    );
  }
 
  function Breadcrumb() {
    const crumbs = ["Home", "Cart", "Checkout"];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#5D757A", marginBottom: 16, flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && <span style={{ color: "#D7E7F5" }}>›</span>}
            <span
              style={{
                color: i === crumbs.length - 1 ? "#202124" : undefined,
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
    const emptyShop = items.length === 0;

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <div className="cart-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#FFFFFF", borderRadius: 16, padding: 6, maxWidth: 420 }}>
            {([
              { id: "shop" as const, label: `Shop (${items.length})` },
              { id: "saved" as const, label: `Saved (${savedItems.length})` },
            ]).map((tab) => (
              <button
                className={cartTab === tab.id ? "cart-tab is-active" : "cart-tab"}
                key={tab.id}
                type="button"
                onClick={() => setCartTab(tab.id)}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 10px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: cartTab === tab.id ? PRIMARY_MID : "transparent",
                  color: cartTab === tab.id ? "#FFFFFF" : "#5D757A",
                  boxShadow: cartTab === tab.id ? "0 6px 16px rgba(137,207,240,0.18)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {cartTab === "saved" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {savedItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px", background: "white", borderRadius: 16, border: "1px solid #D7E7F5" }}>
                <Heart size={28} style={{ color: "#94a3b8", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: "#202124", margin: 0 }}>No saved items</p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Save cart items for later from the Shop tab.</p>
              </div>
            ) : (
              savedItems.map((line) => (
                <div key={String(line.productId ?? line.id)} style={{ background: "white", borderRadius: 14, border: "1px solid #D7E7F5", padding: 16 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "#FFFFFF", flexShrink: 0 }}>
                      {line.image ? <img src={resolveMediaUrl(line.image) || line.image} alt={line.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: 0 }}>{line.name}</p>
                      <p style={{ fontSize: 12, color: "#5D757A", margin: "4px 0 0" }}>Vendor: {line.vendor || "—"}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: "8px 0 0" }}>{formatPrice(line.price)}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                        <PurchaseActionButton action="cart" compact onClick={() => moveSavedToCart(line)} />
                        <button type="button" onClick={() => removeSaved(line)} style={{ border: "none", background: "none", color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : emptyShop ? (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>🛒</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#202124", marginBottom: 8 }}>Your cart is empty</h2>
            <p style={{ fontSize: 13, color: "#5D757A", marginBottom: 24 }}>Add some products to get started!</p>
            <PrimaryBtn onClick={onBack} style={{ padding: "10px 24px", fontSize: 13 }}>
              Continue Shopping
            </PrimaryBtn>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="checkout-main-col" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <AddressBar
                address={currentAddress}
                empty={addressEmpty}
                onChangeAddress={() => setShowAddressModal(true)}
              />

              <div className="cart-panel cart-schedule-panel" style={{ background: "white", borderRadius: 14, border: "1px solid #D7E7F5", overflow: "hidden" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0, padding: "14px 16px", borderBottom: "1px solid #F7FBFF" }}>
                  Delivery Schedule
                </p>
                {([
                  {
                    id: "anytime" as const,
                    title: "Any Time",
                    desc: "Standard delivery at the earliest",
                    icon: <Clock size={18} style={{ color: PRIMARY_MID }} />,
                  },
                  {
                    id: "schedule" as const,
                    title: "Schedule An Appointment",
                    desc: "Choose a specific date & time slot",
                    icon: <Calendar size={18} style={{ color: PRIMARY_MID }} />,
                  },
                ]).map((opt, idx) => (
                  <button
                    className={deliveryMode === opt.id ? "cart-delivery-option is-active" : "cart-delivery-option"}
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryMode(opt.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "none",
                      borderTop: idx === 0 ? "none" : "1px solid #F7FBFF",
                      background: deliveryMode === opt.id ? "#EAF4FF" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EAF4FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {opt.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#202124", margin: 0 }}>{opt.title}</p>
                      <p style={{ fontSize: 12, color: "#5D757A", margin: "2px 0 0" }}>{opt.desc}</p>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: `2px solid ${deliveryMode === opt.id ? PRIMARY_MID : "#cbd5e1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {deliveryMode === opt.id ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: PRIMARY_MID }} /> : null}
                    </div>
                  </button>
                ))}
              </div>

              {deliveryMode === "schedule" && (
                <div style={{ background: "white", borderRadius: 14, border: "1px solid #D7E7F5", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <button type="button" onClick={() => setWeekBase(new Date(weekBase.getTime() - 7 * 86400000))} style={{ border: "1px solid #D7E7F5", background: "white", borderRadius: 8, padding: 6, cursor: "pointer" }}>
                      <ChevronLeft size={16} />
                    </button>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#202124", margin: 0 }}>
                      {MONTHS[weekBase.getMonth()]} {weekBase.getFullYear()}
                    </p>
                    <button type="button" onClick={() => setWeekBase(new Date(weekBase.getTime() + 7 * 86400000))} style={{ border: "1px solid #D7E7F5", background: "white", borderRadius: 8, padding: 6, cursor: "pointer" }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 12 }}>
                    {weekDays.map((d) => {
                      const active = d.toDateString() === selectedDate.toDateString();
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          style={{
                            border: `1px solid ${active ? PRIMARY_MID : "#D7E7F5"}`,
                            background: active ? "#EAF4FF" : "white",
                            borderRadius: 10,
                            padding: "8px 4px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#5D757A" }}>{DAYS[d.getDay()]}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#202124" }}>{d.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSelectedTime(slot.value)}
                        style={{
                          textAlign: "left",
                          border: `1px solid ${selectedTime === slot.value ? PRIMARY_MID : "#D7E7F5"}`,
                          background: selectedTime === slot.value ? "#EAF4FF" : "white",
                          borderRadius: 10,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#202124",
                        }}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div className="cart-panel cart-item-card" key={item.id} style={{ background: "white", borderRadius: 14, border: "1px solid #D7E7F5", padding: 16 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", border: "1px solid #F7FBFF", flexShrink: 0, background: "#FFFFFF" }}>
                      {item.image
                        ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📦</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: 0, wordBreak: "break-word" }}>{item.name}</p>
                          <p style={{ fontSize: 12, color: "#5D757A", margin: "4px 0 0" }}>
                            Vendor: <span style={{ fontWeight: 600, color: PRIMARY_MID }}>{item.vendor || "—"}</span>
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: PRIMARY_MID, flexShrink: 0 }}>
                          <Clock size={14} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Delivery in 30 Mins</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: "#202124", margin: "10px 0 0" }}>{formatPrice(item.price)}</p>
                      <p style={{ fontSize: 12, color: "#89CFF0", fontWeight: 600, margin: "6px 0 0" }}>Eligible for FREE Shipping</p>
                      <p style={{ fontSize: 12, color: "#5D757A", margin: "4px 0 0" }}>
                        Up to {formatPrice(Math.max(1, Math.round(item.price * 0.05)))} redeemable via points (5%)
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: "1px solid #D7E7F5", overflow: "hidden", background: "#FFFFFF" }}>
                          {([
                            { label: "−", action: () => changeQty(item.id, -1) },
                            { label: String(item.qty), action: null as (() => void) | null },
                            { label: "+", action: () => changeQty(item.id, +1) },
                          ]).map((btn, bi) => (
                            <button
                              key={bi}
                              type="button"
                              onClick={btn.action ?? undefined}
                              style={{
                                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 600, background: "transparent",
                                border: "none", borderLeft: bi > 0 ? "1px solid #D7E7F5" : "none",
                                cursor: btn.action ? "pointer" : "default", color: "#202124", fontFamily: "inherit",
                              }}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                        <button
                          className="cart-action-button"
                          type="button"
                          onClick={() => saveForLater(item.id)}
                          style={{ fontSize: 12, fontWeight: 600, color: PRIMARY_MID, display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #D7E7F5", cursor: "pointer", fontFamily: "inherit", padding: "8px 12px", borderRadius: 10 }}
                        >
                          <Heart size={13} /> SAVE FOR LATER
                        </button>
                        <button
                          className="cart-action-button cart-action-danger"
                          type="button"
                          onClick={() => removeItem(item.id)}
                          style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", display: "flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #fecaca", cursor: "pointer", fontFamily: "inherit", padding: "8px 12px", borderRadius: 10 }}
                        >
                          <Trash2 size={13} /> REMOVE
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
        )}
      </div>
    );
  }


  function PaymentStep() {
    const methods: PaymentMethod[] = [
      {
        id: "razorpay",
        label: "Pay online (Razorpay)",
        sub: "UPI, cards, and wallets via Razorpay checkout.",
        right: <span style={{ fontSize: 14, fontWeight: 600, color: PRIMARY_MID, fontFamily: "sans-serif" }}>Razorpay</span>,
      },
      { id: "cod", label: "Cash on Delivery" },
    ];

    return (
      <div className="cart-layout">
        <div className="checkout-main-col" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <AddressBar address={currentAddress} empty={addressEmpty} onChangeAddress={() => setShowAddressModal(true)} />
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #D7E7F5", padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#202124", marginBottom: 14 }}>Payment Method</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {methods.map(pm => (
                <div key={pm.id} onClick={() => setPayMethod(pm.id)}
                  style={{
                    borderRadius: 10, padding: 12, cursor: "pointer",
                    border: `1px solid ${payMethod === pm.id ? PRIMARY_MID : "#D7E7F5"}`,
                    background: payMethod === pm.id ? "#EAF4FF" : "white",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `2px solid ${payMethod === pm.id ? PRIMARY_MID : "#D7E7F5"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {payMethod === pm.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: BTN_GRAD }} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#202124", flex: 1 }}>{pm.label}</span>
                    {pm.right}
                  </div>
                  {pm.sub && (
                    <p style={{ margin: "6px 0 0 26px", fontSize: 11, color: "#5D757A" }}>{pm.sub}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sidebar-col">
          <Sidebar showRedeem={false} />
          {orderError && (
            <p style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{orderError}</p>
          )}
          <button
            className="cart-primary-button"
            onClick={placeOrder}
            disabled={placing || !items.length || addressesLoading}
            style={{
              marginTop: 12, width: "100%", border: "none", borderRadius: 10, padding: "12px 16px",
              background: BTN_GRAD, color: "#FFFFFF", fontWeight: 600, fontSize: 13, cursor: placing ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: placing ? 0.7 : 1,
            }}
          >
            {placing ? <><Loader2 size={16} className="animate-spin" /> Placing Order...</> : payMethod === "cod" ? <>Place Order — {formatPrice(total)}</> : <>Pay {formatPrice(total)}</>}
          </button>
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
            fontWeight: 600, background: "#EAF4FF", color: "#89CFF0", border: "1px solid #D7E7F5", marginBottom: 16,
          }}>
            Order Confirmed
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#202124", margin: "0 0 4px" }}>
            Your order of {formatPrice(placedAmount || itemTotal)}
          </h2>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#202124", margin: "0 0 32px" }}>has been successfully placed!</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onBack ?? (() => goToStep(0))}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
                border: "2px solid #D7E7F5", fontSize: 13, fontWeight: 600, color: "#202124",
                background: "white", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = PRIMARY_MID; (e.currentTarget as HTMLElement).style.color = PRIMARY_MID; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D7E7F5"; (e.currentTarget as HTMLElement).style.color = "#202124"; }}>
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
        * { box-sizing: border-box; }
        .cart-layout { display: grid !important; grid-template-columns: minmax(0, 1fr) 360px; align-items: start; gap: 24px; width: 100%; }
        .checkout-main-col { grid-column: 1; width: 100%; }
        .sidebar-col { grid-column: 2; width: 100%; min-width: 0; position: sticky; top: 16px; }
        .cart-panel, .cart-sidebar-card {
          border-radius: 18px !important;
          border-color: #D7E7F5 !important;
          background: #FFFFFF !important;
          box-shadow: 0 10px 30px rgba(137,207,240,0.065);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .cart-address-panel { padding: 18px 20px !important; }
        .cart-sidebar-card { padding: 18px !important; }
        .cart-item-card:hover { transform: translateY(-2px); border-color: #B8E3F7 !important; box-shadow: 0 14px 36px rgba(137,207,240,0.10); }
        .cart-tabs { border: 1px solid #D7E7F5; box-shadow: 0 6px 20px rgba(137,207,240,0.05); }
        .cart-tab { transition: background .2s ease, color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .cart-tab:hover { color: #89CFF0 !important; }
        .cart-tab.is-active:hover { color: #FFFFFF !important; }
        .cart-delivery-option { transition: background .2s ease, box-shadow .2s ease; }
        .cart-delivery-option:hover { background: #F7FBFF !important; }
        .cart-delivery-option.is-active { background: linear-gradient(90deg, #EAF4FF 0%, #FFFFFF 100%) !important; box-shadow: inset 4px 0 0 #89CFF0; }
        .cart-primary-button:hover:not(:disabled) { opacity: 1 !important; transform: translateY(-1px); box-shadow: 0 12px 26px rgba(137,207,240,.25) !important; }
        .cart-secondary-button { transition: background .18s ease, color .18s ease, transform .18s ease; }
        .cart-secondary-button:hover { background: #89CFF0 !important; color: #FFFFFF !important; transform: translateY(-1px); }
        .cart-action-button { transition: border-color .18s ease, background .18s ease, transform .18s ease; }
        .cart-action-button:hover { border-color: #89CFF0 !important; background: #F7FBFF !important; transform: translateY(-1px); }
        .cart-action-danger:hover { border-color: #dc2626 !important; background: #fff5f5 !important; }
        @media (max-width: 900px) {
          .cart-layout { grid-template-columns: minmax(0, 1fr); }
          .checkout-main-col, .sidebar-col { grid-column: 1; }
          .sidebar-col { position: static; }
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
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: 0 }}>Change Delivery Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#5D757A", padding: 4, fontSize: 18, lineHeight: 1 }}>
                ✕
              </button>
            </div> 
            <p style={{ fontSize: 11, fontWeight: 600, color: "#5D757A", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved Addresses</p>
            {addressesLoading ? (
              <p style={{ fontSize: 12, color: "#5D757A", padding: "12px 0" }}>Loading saved addresses...</p>
            ) : addressError ? (
              <p style={{ fontSize: 12, color: "#b91c1c", padding: "12px 0" }}>{addressError}</p>
            ) : addresses.length ? addresses.map((savedAddress) => {
              const active = String(savedAddress.id) === selectedAddressId;
              return (
                <button
                  key={String(savedAddress.id)}
                  type="button"
                  onClick={() => { selectAddress(savedAddress.id); setShowAddressModal(false); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 8, cursor: "pointer",
                    border: `1px solid ${active ? PRIMARY_MID : "#D7E7F5"}`,
                    background: active ? "#EAF4FF" : "white", fontSize: 12, color: "#202124", textAlign: "left",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span><strong>{savedAddress.label || "Address"}</strong><br />{formatAddress(savedAddress)}</span>
                    {active && <Check size={13} style={{ color: PRIMARY_MID, flexShrink: 0 }} />}
                  </span>
                </button>
              );
            }) : (
              <p style={{ fontSize: 12, color: "#5D757A", padding: "12px 0" }}>No saved addresses yet.</p>
            )}

            <PrimaryBtn
              onClick={() => { window.location.assign("/saved-addresses"); }}
              style={{ width: "100%", padding: "10px 0", marginTop: 10, fontSize: 13 }}>
              Manage Addresses
            </PrimaryBtn>
          </div>
        </div>
      )}

      <div className="cart-checkout-shell" style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 48px" }}>
        {step < 2 && items.length > 0 && <Breadcrumb />}
        {step < 2 && <Stepper />}
        {step === 0 && <CartStep />}
        {step === 1 && <PaymentStep />}
        {step === 2 && <SuccessStep />}
      </div>
    </div>
  );
}
