"use client";

import SocialPage from "./SocialPage";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ShopRoute() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <SocialPage />
      </main>
      <Footer />
    </div>
  );
}
