"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Store, Wrench } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthGuard from "@/providers/AuthGuard";
import { profileApi, type WishlistItem } from "@/lib/api/profile";
import { catalogApi } from "@/lib/api/catalog";
import { pickProductImage, resolveMediaUrl } from "@/lib/media";
import { useCart } from "@/providers/CartContext";
import { getServiceWishlist, removeServiceWishlist, type ServiceWishlistItem } from "@/lib/serviceWishlist";
import PurchaseActionButton from "@/components/shop/PurchaseActionButton";

type UiWishlistItem = WishlistItem & {
  safeName: string;
  safeImage: string;
  safePrice: number;
  vendorId?: string | null;
};

function formatINR(value: number): string {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<UiWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "services" | "sellers">("products");
  const [serviceItems, setServiceItems] = useState<ServiceWishlistItem[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    setServiceItems(getServiceWishlist());
  }, []);

  useEffect(() => {
    let mounted = true;
    profileApi
      .getWishlist()
      .then(async (rows) => {
        const productIds = [...new Set(rows.map((r) => String(r.productId || "").trim()).filter(Boolean))];
        const productMap = new Map<string, { name?: string; image?: string; price?: number; vendorId?: string | null }>();
        await Promise.all(
          productIds.map(async (pid) => {
            try {
              const p = await catalogApi.getProduct(pid);
              const rawPrice = p?.finalPrice ?? p?.sellPrice ?? p?.price ?? 0;
              productMap.set(pid, {
                name: p?.name || undefined,
                image: pickProductImage(p as any) || undefined,
                price: Number(rawPrice || 0),
                vendorId: p?.vendorId ?? null,
              });
            } catch {
              productMap.set(pid, {});
            }
          }),
        );
        if (!mounted) return;
        const uiRows: UiWishlistItem[] = rows.map((row) => {
          const ref = productMap.get(String(row.productId || "").trim());
          return {
            ...row,
            safeName: String(row.productName || ref?.name || "Product"),
            safeImage: String(row.productImage || ref?.image || ""),
            safePrice: Number(row.productPrice || ref?.price || 0),
            vendorId: ref?.vendorId ?? null,
          };
        });
        setItems(uiRows);
        setError(null);
      })
      .catch(() => setError("Unable to load wishlist"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  async function removeItem(productId: string | number) {
    setProcessingId(productId);
    try {
      await profileApi.removeFromWishlist(productId);
      setItems((prev) => prev.filter((x) => String(x.productId) !== String(productId)));
    } finally {
      setProcessingId(null);
    }
  }

  const count = useMemo(() => items.length, [items]);
  const servicesCount = useMemo(() => serviceItems.length, [serviceItems]);
  const isProductsTab = activeTab === "products";
  const isServicesTab = activeTab === "services";

  function removeServiceItem(serviceId: string | number) {
    const rows = removeServiceWishlist(serviceId);
    setServiceItems(rows);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-[1070px] px-4 py-8">
          <div className="mb-10 flex items-center gap-8">
            <button
              onClick={() => router.push("/profile")}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-900" />
            </button>
            <h1 className="text-[24px] font-bold leading-none text-neutral-950">My Wishlist</h1>
          </div>

          <div className="mb-20 grid grid-cols-3 gap-1 rounded-[18px] bg-slate-100 p-1.5">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center justify-center gap-2 rounded-[14px] py-3 text-[16px] font-medium transition ${
                activeTab === "products" ? "bg-white text-neutral-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Heart className="h-5 w-5" /> Products ({count})
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`flex items-center justify-center gap-2 rounded-[14px] py-3 text-[16px] font-medium transition ${
                activeTab === "services" ? "bg-white text-neutral-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Wrench className="h-5 w-5" /> Services ({servicesCount})
            </button>
            <button
              onClick={() => setActiveTab("sellers")}
              className={`flex items-center justify-center gap-2 rounded-[14px] py-3 text-[16px] font-medium transition ${
                activeTab === "sellers" ? "bg-white text-neutral-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Store className="h-5 w-5" /> Sellers (0)
            </button>
          </div>

          {loading && <p className="text-slate-500">Loading wishlist...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && ((isProductsTab && items.length === 0) || (isServicesTab && serviceItems.length === 0) || (!isProductsTab && !isServicesTab)) && (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Heart className="mb-8 h-16 w-16 text-slate-500" strokeWidth={1.7} />
              <p className="text-[24px] font-medium text-neutral-950">No items yet</p>
              <p className="mt-4 text-[16px] text-slate-500">Browse products and tap the heart icon to save</p>
            </div>
          )}

          {isProductsTab && items.length > 0 && <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded-md border overflow-hidden bg-slate-50 shrink-0">
                    {item.safeImage ? (
                      <img
                        src={resolveMediaUrl(item.safeImage) || item.safeImage}
                        alt={item.safeName}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{item.safeName}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{formatINR(item.safePrice)}</p>
                    <Link
                      href={
                        item.vendorId
                          ? `/shop/${encodeURIComponent(String(item.vendorId))}/${encodeURIComponent(String(item.productId))}`
                          : "/shop"
                      }
                      className="text-xs text-teal-700 hover:underline mt-1 inline-block"
                    >
                      View Product
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PurchaseActionButton
                    action="cart"
                    compact
                    onClick={() =>
                      addToCart({
                        id: item.productId,
                        productId: item.productId,
                        name: item.safeName,
                        price: item.safePrice,
                        originalPrice: item.safePrice,
                        imageUrl: item.safeImage,
                        vendor: "",
                        vendorId: String(item.vendorId || ""),
                      })
                    }
                  />
                  <button
                    onClick={() => removeItem(item.productId)}
                    disabled={processingId === item.productId}
                    className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>}

          {isServicesTab && serviceItems.length > 0 && (
            <div className="space-y-3">
              {serviceItems.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-md border overflow-hidden bg-slate-50 shrink-0">
                      {item.image ? <img src={resolveMediaUrl(item.image) || item.image} alt={item.title} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{item.provider || "Service"}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{formatINR(Number(item.price || 0))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/service" className="px-3 py-1.5 rounded-lg text-xs bg-teal-600 text-white hover:bg-teal-700">
                      View Service
                    </Link>
                    <button
                      onClick={() => removeServiceItem(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
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
