"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyWorkspace from "@/components/property/PropertyWorkspace";
import AuthGuard from "@/providers/AuthGuard";

export default function PropertiesPage() {
  return <AuthGuard><div className="min-h-screen bg-slate-50"><Header/><PropertyWorkspace/><Footer/></div></AuthGuard>;
}