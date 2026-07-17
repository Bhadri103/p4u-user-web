"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { contentApi } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";

interface ProductCard {
  id?: string;
  vendorId?: string;
  name: string;
  subtitle: string | null;
  price: string | null;
  image: string;
  orderCount: number;
}

export default function BestProducts() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fromFeatured = (items: Array<{ id: string; vendorId?: string | null; name: string; price?: string | number | null; imageUrl?: string | null; orderCount?: number }>) =>
      items.slice(0, 12).map((p) => ({
        id: p.id,
        vendorId: p.vendorId ? String(p.vendorId) : "",
        name: p.name,
        subtitle: null,
        price: p.price ? (String(p.price).startsWith("₹") ? String(p.price) : `₹${p.price}`) : null,
        image: (p.imageUrl && resolveMediaUrl(p.imageUrl)) || p.imageUrl || "",
        orderCount: Number(p.orderCount ?? 0),
      }));

    contentApi
      .getFeaturedProducts()
      .then((items) => setProducts(fromFeatured(items)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!loading && products.length === 0) return null;

  return (
    <div className=" mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4">
       <div
  className="rounded-2xl sm:rounded-3xl overflow-hidden"
  style={{
    background: `
      linear-gradient(
        to bottom,
        transparent 0%,
        transparent 50%,
        white 50%,
        white 100%
      ),
      radial-gradient(
        at 60% 25%,
        rgb(26, 74, 58) 0%,
        rgb(14, 34, 31) 55%,
        rgb(8, 24, 18) 100%
      )
    `,
  }}
>

          <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6"> 
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl text-white font-bold">
                Best of Products
              </h2>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => scroll("left")}
                  className="bg-white rounded-full p-1.5 sm:p-2 lg:p-2.5 hover:bg-gray-100 transition-colors shadow-md"
                  aria-label="Scroll left"
                >
                  <ChevronLeft
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "var(--primary-teal)" }}
                  />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="bg-white rounded-full p-1.5 sm:p-2 lg:p-2.5 hover:bg-gray-100 transition-colors shadow-md"
                  aria-label="Scroll right"
                >
                  <ChevronRight
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: "var(--primary-teal)" }}
                  />
                </button>
              </div>
            </div>

            {/* Products Slider */}
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto scrollbar-hide pb-4 sm:pb-6"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (product.vendorId && product.id) router.push(`/shop/${product.vendorId}/${product.id}`);
                    else router.push("/shop");
                  }}
                  className="flex-shrink-0 w-[160px] sm:w-[200px] lg:w-[240px] bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <div className="h-[160px] sm:h-[200px] lg:h-[240px] bg-white flex items-center justify-center p-4 sm:p-5 lg:p-6">
                    {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" /> : (
                      <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">No image</div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 lg:p-5 text-center bg-white border-t border-gray-100">
                    <p className="text-xs sm:text-sm lg:text-base text-gray-800 mb-1 font-medium line-clamp-2">
                      {product.name}
                    </p>
                    {product.subtitle && (
                      <p className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">
                        {product.subtitle}
                      </p>
                    )}
                    {product.price && (
                      <p className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg">
                        From {product.price}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-medium text-teal-700">
                      {product.orderCount} completed {product.orderCount === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
