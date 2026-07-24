"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/providers/CartContext";
import { Loader2 } from "lucide-react";

/**
 * Legacy /checkout is aligned to CartCheckout: buy-now items are merged into the
 * cart, then the user is sent to /cart which supports address + COD + online pay.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "buy-now") {
      try {
        const raw = sessionStorage.getItem("p4u_buy_now_item");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === "object") {
          addToCart({
            id: String(parsed.productId || parsed.id || ""),
            productId: String(parsed.productId || parsed.id || ""),
            name: String(parsed.name || parsed.productName || "Product"),
            price: Number(parsed.price || parsed.unitPrice || 0),
            originalPrice: Number(parsed.originalPrice || parsed.price || parsed.unitPrice || 0),
            qty: Number(parsed.qty || parsed.quantity || 1),
            vendorId: String(parsed.vendorId || ""),
            vendor: String(parsed.vendor || parsed.vendorName || ""),
            image: parsed.image || parsed.imageUrl || parsed.productImage || "",
            imageUrl: parsed.imageUrl || parsed.image || parsed.productImage || "",
          });
          sessionStorage.removeItem("p4u_buy_now_item");
        }
      } catch {
        // ignore
      }
    }
    router.replace("/cart");
  }, [router, searchParams, addToCart]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );
}
