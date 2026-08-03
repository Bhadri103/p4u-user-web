"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyWorkspace from "@/components/property/PropertyWorkspace";
import AuthGuard from "@/providers/AuthGuard";

export default function PropertiesPage() {
  return <AuthGuard><div className="flex min-h-screen flex-col bg-slate-50"><Header/><main className="flex-1"><PropertyWorkspace/></main><Footer/></div></AuthGuard>;
}
