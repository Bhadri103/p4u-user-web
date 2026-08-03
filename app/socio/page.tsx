"use client";

import SocialPage from "./SocialPage";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WorkspaceScrollGuard from "@/components/layout/WorkspaceScrollGuard";

export default function ShopRoute() {
  return (
    <>
      <div className="p4u-locked-workspace flex min-h-screen flex-col lg:h-dvh lg:overflow-hidden">
        <WorkspaceScrollGuard />
        <Header />
        <main className="min-h-0 flex-1 lg:overflow-hidden">
          <SocialPage />
        </main>
      </div>
      <Footer />
    </>
  );
}
