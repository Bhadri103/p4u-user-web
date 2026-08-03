"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyDetailView from "@/components/property/PropertyDetailView";

export default function FindHomeDetailPage({ params }: { params: { id: string } }) {
  return <div className="min-h-screen bg-slate-50"><Header/><PropertyDetailView id={params.id}/><Footer/></div>;
}
