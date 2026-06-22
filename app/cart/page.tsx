"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ShopPage from "@/app/shop/shop";
import VendorDetailPage from "@/app/shop/VendorPage";
import CartCheckout from "@/app/cart/CartCheckout";

type View =
  | { type: "shop" }
  | { type: "vendor"; vendorId: string }
  | { type: "cart" };

export default function ShopRoute() {
  const [view, setView] = useState<View>({ type: "shop" }); 
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("openCart") === "1") {
        sessionStorage.removeItem("openCart");
        setView({ type: "cart" });
      }
    }
  }, []);

  function openCart() {
    setView({ type: "cart" });
  }

  function goToShop() {
    setView({ type: "shop" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartOpen={openCart} />

      <main className="flex-1">
        {view.type === "shop" && (
          <ShopPage
            onVendorSelect={(vendorId: string) =>
              setView({ type: "vendor", vendorId })
            }
          />
        )}

        {view.type === "vendor" && (
          <VendorDetailPage
            vendorId={view.vendorId}
            onBack={goToShop}
          />
        )}

        {view.type === "cart" && (
          <CartCheckout onBack={goToShop} />
        )}
      </main>

      <Footer />
    </div>
  );
}