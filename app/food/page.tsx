"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FoodBrowseView from "@/components/food/FoodBrowseView";
import FoodModuleGate from "@/components/food/FoodModuleGate";

export default function FoodPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7FBFF]">
      <Header />
      <main className="flex-1">
        <FoodModuleGate>
          <FoodBrowseView />
        </FoodModuleGate>
      </main>
      <Footer />
    </div>
  );
}
