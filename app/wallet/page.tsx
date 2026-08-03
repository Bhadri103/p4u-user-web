"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthGuard from "@/providers/AuthGuard";
import { PageRewardPoints } from "@/app/profile/Profilepage";

export default function WalletPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="bg-background px-4">
          <PageRewardPoints onBack={() => router.push("/profile")} />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
