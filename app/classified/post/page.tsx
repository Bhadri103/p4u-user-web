"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClassifiedPostView from "@/components/classified/ClassifiedPostView";

export default function ClassifiedPostRoute() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7FBFF]">
      <Header />
      <main className="flex-1">
        <ClassifiedPostView />
      </main>
      <Footer />
    </div>
  );
}
