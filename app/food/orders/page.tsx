"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FoodOrdersView from "@/components/food/FoodOrdersView";
export default function FoodOrdersPage() { return <div className="flex min-h-screen flex-col bg-[#f8fafc]"><Header /><main className="flex-1"><FoodOrdersView /></main><Footer /></div>; }
