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
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </button>
            <h1 className="text-4xl font-semibold text-slate-900 leading-none">My Wishlist</h1>
          </div>

          <div className="bg-slate-100 rounded-2xl p-1.5 grid grid-cols-3 gap-1 mb-8">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "products" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Heart className="w-4 h-4" /> Products ({count})
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "services" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Wrench className="w-4 h-4" /> Services ({servicesCount})
            </button>
            <button
              onClick={() => setActiveTab("sellers")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "sellers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              <Store className="w-4 h-4" /> Sellers (0)
            </button>
          </div>

          {loading && <p className="text-slate-500">Loading wishlist...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && ((isProductsTab && items.length === 0) || (isServicesTab && serviceItems.length === 0) || (!isProductsTab && !isServicesTab)) && (
            <div className="min-h-[280px] flex flex-col items-center justify-center text-center">
              <Store className="w-14 h-14 text-slate-500 mb-3" />
              <p className="text-3xl font-medium text-slate-800">No items yet</p>
              <Link href="/shop" className="text-sm text-teal-700 hover:underline mt-2">
                Browse and add to wishlist
              </Link>
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
                    <p className="font-medium text-slate-900 truncate">{item.safeName}</p>
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
                  <button
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
                    className="px-3 py-1.5 rounded-lg text-xs bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Move to Cart
                  </button>
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
                      <p className="font-medium text-slate-900 truncate">{item.title}</p>
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
