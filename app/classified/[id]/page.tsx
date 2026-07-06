"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClassifiedAdDetailView from "@/components/classified/ClassifiedAdDetailView";

export default function ClassifiedDetailRoute({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />
      <main className="flex-1">
        <ClassifiedAdDetailView id={params.id} />
      </main>
      <Footer />
    </div>
  );
}
