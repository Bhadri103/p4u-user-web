"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ServiceListPage  from "@/app/service/ServiceListPage";
import VendorDetailPage from "@/app/service/VendorDetailPage";
import { Seller } from "@/app/service/serviceData";
import { resolveVendorIdForCatalogService } from "@/lib/catalog/resolveServiceVendor";

export default function ShopRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedVendorId = useMemo(() => {
    const raw = searchParams.get("vendorId");
    return raw ? raw.trim() : "";
  }, [searchParams]);
  const [view, setView] = useState<"list" | "vendor">(
    requestedVendorId ? "vendor" : "list",
  );
  const [vendorId, setVendorId] = useState<string | null>(
    requestedVendorId || null,
  );
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [navMessage, setNavMessage] = useState<string | null>(null);
  const [bookingPrefill, setBookingPrefill] = useState<{
    serviceId: string;
    title: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    if (requestedVendorId) {
      setView("vendor");
      setVendorId(requestedVendorId);
      setBookingPrefill(null);
      setNavMessage(null);
    }
  }, [requestedVendorId]);

  const handleSelectSeller = async (seller: Seller) => {
    setNavMessage(null);
    setBusyServiceId(String(seller.id));
    try {
      const explicit = seller.vendorId?.trim();
      if (explicit) {
        setBookingPrefill({
          serviceId: String(seller.id),
          title: seller.title,
          price: Number.isFinite(seller.price) ? seller.price : 0,
        });
        setVendorId(explicit);
        setView("vendor");
        window.scrollTo(0, 0);
        return;
      }
      const resolved = await resolveVendorIdForCatalogService(
        seller.id,
        seller.title,
        explicit,
      );
      const vid = (explicit || resolved || "").trim();
      if (!vid) {
        setNavMessage(
          "This service is not linked to a service vendor yet. In the catalog, assign it to a Service Vendor.",
        );
        return;
      }
      setBookingPrefill({
        serviceId: String(seller.id),
        title: seller.title,
        price: Number.isFinite(seller.price) ? seller.price : 0,
      });
      setVendorId(vid);
      setView("vendor");
      window.scrollTo(0, 0);
    } finally {
      setBusyServiceId(null);
    }
  };

  const handleBack = () => {
    setView("list");
    setVendorId(null);
    setBookingPrefill(null);
    setNavMessage(null);
    if (requestedVendorId) {
      router.replace("/service");
    }
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {navMessage && view === "list" && (
          <div
            className="max-w-[1300px] mx-auto px-4 pt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg py-2 flex flex-wrap items-center justify-between gap-2"
            role="status"
          >
            <span>{navMessage}</span>
            <button
              type="button"
              className="text-amber-800 underline text-xs shrink-0"
              onClick={() => setNavMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        {view === "vendor" && vendorId ? (
          <VendorDetailPage
            vendorId={vendorId}
            onBack={handleBack}
            prefillServiceId={bookingPrefill?.serviceId ?? null}
            prefillServiceTitle={bookingPrefill?.title}
            prefillPrice={bookingPrefill?.price}
            autoOpenBooking={Boolean(bookingPrefill)}
          />
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