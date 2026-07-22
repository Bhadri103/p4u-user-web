"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FoodBrowseView from "@/components/food/FoodBrowseView";
export default function FoodPage() { return <div className="flex min-h-screen flex-col bg-[#f8fafc]"><Header /><main className="flex-1"><FoodBrowseView /></main><Footer /></div>; }
