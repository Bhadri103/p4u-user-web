"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServiceListPage from "@/app/service/ServiceListPage";
import ServiceDetailView from "@/app/service/ServiceDetailView";
import { Seller } from "@/app/service/serviceData";
import { resolveVendorIdForCatalogService } from "@/lib/catalog/resolveServiceVendor";

export default function ServiceRoute() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<Seller | null>(null);
  const [vendorId, setVendorId] = useState<string>("");
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);

  const handleSelectSeller = async (seller: Seller) => {
    setSelected(seller);
    setVendorId(seller.vendorId?.trim() || "");
    setView("detail");
    window.scrollTo(0, 0);
    // Resolve the booking vendor in the background so Book Now works.
    if (!seller.vendorId?.trim()) {
      setBusyServiceId(String(seller.id));
      try {
        const resolved = await resolveVendorIdForCatalogService(seller.id, seller.title, "");
        if (resolved) setVendorId(resolved.trim());
      } finally {
        setBusyServiceId(null);
      }
    }
  };

  const handleBack = () => {
    setView("list");
    setSelected(null);
    setVendorId("");
    window.scrollTo(0, 0);
  };

  return (
    <div className="commerce-marketplace flex min-h-screen flex-col">
      <Header variant="marketplace" />
      <main className="min-h-0 flex-1">
        {view === "detail" && selected ? (
          <div>
            <ServiceDetailView
              service={selected}
              vendorId={vendorId}
              categoryName={selected.category || undefined}
              onBack={handleBack}
            />
          </div>
        ) : (
          <ServiceListPage
            onSelectSeller={handleSelectSeller}
            busyServiceId={busyServiceId}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
