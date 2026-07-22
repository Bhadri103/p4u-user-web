"use client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FoodRestaurantView from "@/components/food/FoodRestaurantView";
export default function FoodRestaurantPage({ params }: { params: { restaurantId: string } }) { return <div className="flex min-h-screen flex-col bg-[#f8fafc]"><Header /><main className="flex-1"><FoodRestaurantView restaurantId={params.restaurantId} /></main><Footer /></div>; }
