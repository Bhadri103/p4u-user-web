"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Booking from "@/app/booking/booking";

export default function BookingRoute() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Booking />
      </main>
      <Footer />
    </div>
  );
}
