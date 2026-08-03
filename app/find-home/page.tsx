"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyWorkspace from "@/components/property/PropertyWorkspace";

export default function FindHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1"><PropertyWorkspace /></main>
      <Footer />
    </div>
  );
}
