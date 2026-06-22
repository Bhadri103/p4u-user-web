"use client";
import { ChevronLeft, ChevronRight, Star, MapPin, Clock } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { catalogApi } from "@/lib/api/catalog";
import { pickVendorImage, resolveMediaUrl } from "@/lib/media";

export default function TopServicer() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<{ id: string; image: string; badge: string | null; title: string; provider: string; rating: number; duration: string; description: string; price: number; distance: string }[]>([]);

  useEffect(() => {
    catalogApi.getVendors({ limit: 8, vendorKind: "service" }).then((res) => {
      const mapped = (res.data ?? []).map((v) => ({
        id: String(v.id),
        image: pickVendorImage(v as any) || (v as any).logoUrl || (v as any).logo || "",
        badge: null,
        title: v.businessName || v.name || "Vendor",
        provider: v.ownerName || v.description || "Professional vendor",
        rating: Number(v.rating ?? 4.8),
        duration: "Fast service",
        description: v.description ?? "Trusted local service provider",
        price: 0,
        distance: "Service available",
      }));
      setServices(mapped);
    }).catch(() => {
      setServices([]);
    });
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth < 640 ? 280 : window.innerWidth < 1024 ? 360 : 420;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    
 <div className="w-full mx-auto max-w-[1400px] px-4 xl:px-6 mt-8"> 
       <div
  className="rounded-2xl sm:rounded-3xl overflow-hidden"
  style={{
   background: "#009999",
  }}
>

          <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6"> 
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl text-white font-bold">
                Top Vendors
              </h2>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => scroll("left")}
                  className="bg-white rounded-full p-2 sm:p-2.5 hover:bg-gray-100 transition-colors shadow-md"
                  aria-label="Scroll left"
                >
                  <ChevronLeft
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "var(--primary-teal)" }}
                  />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="bg-white rounded-full p-2 sm:p-2.5 hover:bg-gray-100 transition-colors shadow-md"
                  aria-label="Scroll right"
                >
                  <ChevronRight
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "var(--primary-teal)" }}
                  />
                </button>
              </div>
            </div> 
            {services.length === 0 ? (
              <div className="rounded-xl border border-white/30 bg-white/10 text-white text-sm px-4 py-5">
                No top services available right now.
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {services.map((service, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[260px] sm:w-[340px] lg:w-[400px] bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                > 
                  <div className="relative h-[160px] sm:h-[200px] lg:h-[220px]">
                    {service.image ? (
                      <img
                        src={resolveMediaUrl(service.image) || service.image}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 text-slate-500 text-xs flex items-center justify-center">
                        No image
                      </div>
                    )}
                    {service.badge && (
                      <div
                        className="absolute top-3 sm:top-4 left-3 sm:left-4 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-white text-xs sm:text-sm font-medium backdrop-blur-md border-2 border-white shadow-lg overflow-hidden"
                        style={{
                          backgroundColor: "#1a9b8e",
                          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
                        }}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent animate-diagonal-shimmer"
                          style={{
                            width: "200%",
                            height: "200%",
                            top: "-50%",
                            left: "-50%",
                          }}
                        ></div>
                        <span className="relative z-10">{service.badge}</span>
                      </div>
                    )} 
                    <button
                      className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-white rounded-full p-1.5 sm:p-2 hover:bg-gray-100 transition-colors"
                      aria-label="Add to favorites"
                    >
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button> 
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">
                        {service.distance}
                      </span>
                    </div>
                  </div> 
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight flex-1">
                        {service.title}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs sm:text-sm font-bold text-gray-900">
                          {service.rating}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-1">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{service.provider}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{service.duration || "Fast service"}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">
                      {service.description}
                    </p>
                    {service.price > 0 && (
                      <p className="text-sm font-semibold text-slate-900 mb-3">From ₹{service.price.toLocaleString("en-IN")}</p>
                    )}
<button
  type="button"
  onClick={() => router.push(service.id ? `/service?vendorId=${encodeURIComponent(service.id)}` : "/service")}
  className="w-full py-2 sm:py-2.5 text-white text-xs sm:text-sm font-medium transition-all hover:opacity-90"
  style={{
    borderRadius: "10px",
    background:
      "radial-gradient(ellipse at 60% 25%, #1a4a3a 0%, #0E221F 55%, #081812 100%)",
  }}
>
  Book now
</button>


                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </div>
    
  );
}