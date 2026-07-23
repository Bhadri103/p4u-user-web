"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartCheckout from "@/app/cart/CartCheckout";

export default function CartRoute() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <CartCheckout onBack={() => { window.location.href = "/shop"; }} />
      </main>
      <Footer />
    </div>
  );
}
