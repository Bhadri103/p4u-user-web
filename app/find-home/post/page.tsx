"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyWorkspace from "@/components/property/PropertyWorkspace";
import AuthGuard from "@/providers/AuthGuard";

export default function FindHomePostPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F9FAFB]">
        <Header />
        <PropertyWorkspace embedPost />
        <Footer />
      </div>
    </AuthGuard>
  );
}
