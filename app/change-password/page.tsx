"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthGuard from "@/providers/AuthGuard";
import { PageChangePassword } from "@/app/profile/Profilepage";

export default function ChangePasswordPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F9FAFB]">
        <Header />
        <main className="px-4">
          <PageChangePassword onBack={() => router.push("/profile")} />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
