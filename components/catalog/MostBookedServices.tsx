"use client";

import { useState, useEffect } from "react";
import { Heart, Clock, Star } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { catalogApi } from "@/lib/api/catalog";
import { pickServiceImage, resolveMediaUrl } from "@/lib/media";

import homeApp from "../../images/home-services/home-application-left.png";

export default function ServiceComponents() {
  const SHOW_HOME_SERVICES = false;
  const router = useRouter();
  const [mostBookedServices, setMostBookedServices] = useState<{ id: string | number; image: string; title: string; rating: number; reviews: number; price: number; originalPrice: number; duration: string; description: string; offer: string }[]>([]);
  const [homeServices, setHomeServices] = useState<{ id: string; vendorId: string; name: string; price: string; image: string }[]>([]);

  useEffect(() => {
    catalogApi
      .getServices({ limit: 8, offset: 0 })
      .then((res) => {
        if (!res?.data?.length) return;
        setHomeServices(
          res.data.map((s, idx) => {
            const unit = Number((s as any).basePrice ?? (s as any).price ?? (s as any).metadata?.price ?? 0);
            return {
              id: String(s.id ?? idx),
              vendorId: String((s as any).vendorId ?? ""),
              name: s.name,
              price: unit > 0 ? `₹${unit.toLocaleString("en-IN")}` : "",
              image: pickServiceImage(s as any) || "",
            };
          }),
        );
      })
      .catch(() => {
        setHomeServices([]);
      });

    catalogApi.getServices({ limit: 10 }).then((res) => {
      setMostBookedServices(
        (res.data ?? []).map((s) => ({
          id: s.id,
          image: pickServiceImage(s as any) || "",
          title: s.name || "Service",
          rating: 0,
          reviews: 0,
          price: Number((s as any).metadata?.price ?? (s as any).price ?? 0),
          originalPrice: (s as any).metadata?.originalPrice
            ? Number((s as any).metadata.originalPrice)
            : Number((s as any).metadata?.price ?? 0),
          duration: String((s as any).metadata?.duration ?? ""),
          description: s.description ?? "",
          offer: "",
        })),
      );
    }).catch(() => {
      setMostBookedServices([]);
    });
  }, []);

  return (
    <div className=" mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6     ">
      <section className="my-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl mb-2   font-bold">
          Most Booked services
        </h2>
        {mostBookedServices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No booked services available.
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
          {mostBookedServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg border p-2 border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col min-h-[315px]"
            >
              {/* Image Container */}
              <div className="relative bg-gray-100 h-32 sm:h-36 lg:h-40">
                <button className="absolute top-2 right-2 z-10 w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 shadow-sm">
                  <Heart className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400" />
                </button>

                {service.image ? (
                  <img
                    src={resolveMediaUrl(service.image) || service.image}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center">
                    No image
                  </div>
                )}
 
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white rounded px-1.5 py-0.5 shadow-sm">
                  <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                  <span className="font-semibold text-xs">
                    {service.rating}
                  </span>
                </div>
              </div>
 
              <div className="p-2.5 lg:p-3 flex flex-col flex-1">
                {/* Title */}
                <h3 className="font-semibold text-xs lg:text-sm leading-tight line-clamp-2 mb-2 min-h-[32px]">
                  {service.title}
                </h3>
 
                <div className="mb-2">
                  <div className="text-xs lg:text-sm">
                    <span className="text-gray-600">Starts at </span>
                    <span className="font-bold text-black">
                      ₹{service.price}
                    </span>
                    <span className="line-through text-gray-400 ml-1 text-xs">
                      ₹{service.originalPrice}
                    </span>
                  </div>
                </div> 
                <div className="flex items-center gap-1 text-gray-600 text-xs mb-2">
                  <Clock className="w-3 h-3" />
                  <span>{service.duration}</span>
                </div>
 
                <p className="text-xs text-gray-600 line-clamp-2 mb-2 min-h-[28px]">
                  {service.description}
                </p>
 
                {service.offer ? (
                  <div className="mb-2">
                    <span className="inline-block bg-green-500 text-white px-2 py-0.5 text-xs rounded font-medium">
                      {service.offer}
                    </span>
                  </div>
                ) : null}
                <button
                  className="w-full py-1.5 lg:py-2 border border-teal-500 text-teal-600 rounded text-xs lg:text-sm font-medium hover:bg-teal-50 transition-colors mt-auto"
                  onClick={() => router.push("/service")}
                >
                  Book now
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </section> 
    {SHOW_HOME_SERVICES && (
    <section className="my-6"> 
        <div className="block lg:hidden mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">Home Services</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"> 
          <div className="hidden lg:flex lg:col-span-1 lg:row-span-2 bg-[#f5e6d3] rounded-lg overflow-hidden relative">
            <div className="w-full h-full flex flex-col"> 
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Home Services
                </h2>
              </div> 
              <div className="flex-1 flex items-end justify-center">
                <Image
                  src={homeApp}
                  alt="Home Services"
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
 
          {homeServices.map((service) => (
            <div
              key={service.id}
              onClick={() => {
                router.push("/service");
              }}
              className="bg-white rounded-lg p-3 sm:p-4 lg:p-4 hover:shadow-md transition-shadow border border-gray-200 cursor-pointer min-h-[170px]"
            >
              <div className="flex flex-col h-full">
                <h3 className="font-medium text-sm lg:text-base text-left mb-1">
                  {service.name}
                </h3>
                <div className="text-left mb-2">
                  <p className="text-gray-400 text-xs">From</p>
                  <p className="font-normal text-sm text-gray-700">
                    {service.price}
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-end">
                  {service.image ? (
                    <img
                      src={resolveMediaUrl(service.image) || service.image}
                      alt={service.name}
                      className="object-contain max-w-full max-h-full w-[90px] h-[90px]"
                    />
                  ) : (
                    <div className="w-[90px] h-[90px] rounded-md bg-slate-100 text-slate-500 text-xs flex items-center justify-center">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}
    </div>
  );
}
