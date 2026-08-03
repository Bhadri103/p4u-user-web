"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClassifiedAdsView from "@/components/classified/ClassifiedAdsView";

export default function ClassifiedRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ClassifiedAdsView />
      </main>
      <Footer />
    </div>
  );
}
