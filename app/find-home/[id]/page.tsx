"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyDetailView from "@/components/property/PropertyDetailView";
import AuthGuard from "@/providers/AuthGuard";

export default function FindHomeDetailPage({ params }: { params: { id: string } }) {
  return <AuthGuard><div className="min-h-screen bg-slate-50"><Header/><PropertyDetailView id={params.id}/><Footer/></div></AuthGuard>;
}