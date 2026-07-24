"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isFoodModuleEnabled } from "@/lib/features";

/** Keeps Food routes in the tree but redirects when the module is hidden. */
export default function FoodModuleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isFoodModuleEnabled) router.replace("/");
  }, [router]);
  if (!isFoodModuleEnabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}
