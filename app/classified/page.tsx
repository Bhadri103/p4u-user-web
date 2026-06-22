"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Classified from "@/app/classified/classified";

export default function ClassifiedRoute() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Classified />
      </main>
      <Footer />
    </div>
  );
}
