"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { contentApi } from "@/lib/api/content";
import { catalogApi } from "@/lib/api/catalog";
import { resolveCatalogUnitPrice } from "@/lib/catalog/resolvePrice";
import { resolveMediaUrl } from "@/lib/media";
import bluetooth from "../../images/best-products/bluetooth-speaker.png";
import mobile from "../../images/best-products/mobile.png";
import moniter from "../../images/best-products/moniter.png";
import printer from "../../images/best-products/printer.png";
import watch from "../../images/best-products/watch.png";

interface ProductCard {
  id?: string;
  vendorId?: string;
  name: string;
  subtitle: string | null;
  price: string | null;
  image: any;
}

export default function BestProducts() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fromFeatured = (items: Array<{ name: string; section?: string | null; price?: string | number | null; imageUrl?: string | null }>) =>
      items.slice(0, 12).map((p) => ({
        name: p.name,
        subtitle: p.section ?? null,
        price: p.price ? (String(p.price).startsWith("₹") ? String(p.price) : `₹${p.price}`) : null,
        image: (p.imageUrl && resolveMediaUrl(p.imageUrl)) || p.imageUrl || mobile,
      }));

    const fromCatalog = async () => {
      const res = await catalogApi.browseProducts({ limit: 12, offset: 0 });
      return (res.data ?? []).map((p) => {
        const unit = resolveCatalogUnitPrice(p as unknown as Record<string, unknown>);
        return {
          id: String(p.id ?? ""),
          vendorId: String(p.vendorId ?? ""),
          name: p.name || "Product",
          subtitle: null,
          price: unit > 0 ? `₹${unit}` : null,
          image: resolveMediaUrl(p.thumbnailUrl) || p.thumbnailUrl || mobile,
        };
      });
    };

    contentApi
      .getFeaturedProducts()
      .then(async (items) => {
        const featured = fromFeatured(items);
        if (featured.length > 0) {
          setProducts(featured);
          return;
        }
        const catalogRows = await fromCatalog();
        setProducts(catalogRows);
      })
      .catch(async () => {
        try {
          const catalogRows = await fromCatalog();
          setProducts(catalogRows);
        } catch {
          setProducts([]);
        }
      })
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
                    <div className="relative w-full h-full">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain"
                      />
                    </div>
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
