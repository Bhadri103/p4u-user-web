"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthGuard from "@/providers/AuthGuard";
import { PageSavedAddresses } from "@/app/profile/Profilepage";

export default function SavedAddressesPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F7FBFF]">
        <Header />
        <main className="px-4">
          <PageSavedAddresses onBack={() => router.push("/profile")} />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
