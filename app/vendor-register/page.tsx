"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VendorRegisterView from "@/components/vendor/VendorRegisterView";

export default function VendorRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />
      <main className="flex-1">
        <VendorRegisterView />
      </main>
      <Footer />
    </div>
  );
}
