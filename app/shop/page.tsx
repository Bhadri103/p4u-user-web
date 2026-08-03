// app/shop/page.tsx
"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ShopPage from "@/app/shop/shop";
import { useRouter } from "next/navigation";

export default function ShopRoute() {
  const router = useRouter();

  return (
    <div className="commerce-marketplace flex min-h-screen flex-col">
      <Header variant="marketplace" />
      <main className="min-h-0 flex-1">
        <ShopPage
          onVendorSelect={(vendorId: string) => {
            router.push(`/shop/${vendorId}`);
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
