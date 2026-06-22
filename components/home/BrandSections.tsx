"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { contentApi } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";
import iphone from "../../images/brand-section/iphone-card.png";
import realme from "../../images/brand-section/realme-card.png";
import xiaomi from "../../images/brand-section/xiaomi-card.png";

type BrandEntry = { image: any; alt: string };

export default function BrandSections() {
  const [originalBrands, setOriginalBrands] = useState<BrandEntry[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const brands = [...originalBrands, ...originalBrands, ...originalBrands];

  useEffect(() => {
    contentApi.getBrands().then((items) => {
      if (items.length) {
        setOriginalBrands(items.map((b) => ({
          image: (b.imageUrl && (resolveMediaUrl(b.imageUrl) || b.imageUrl)) || b.imageUrl,
          alt: b.name,
        })));
        setCurrentSlide(items.length);
      }
    }).catch(() => {});
  }, []);
 
  useEffect(() => {
    const startAutoScroll = () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
      
      autoScrollTimer.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const next = prev + 1; 
          if (next >= originalBrands.length * 2) { 
            setTimeout(() => {
              if (scrollRef.current) {
                const scrollWidth = scrollRef.current.scrollWidth / brands.length;
                scrollRef.current.scrollTo({
                  left: scrollWidth * originalBrands.length,
                  behavior: "auto",
                });
              }
              setCurrentSlide(originalBrands.length);
            }, 300);
          }
          return next;
        });
      }, 4000);
    };

    startAutoScroll();
    
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);
 
  useEffect(() => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth / brands.length;
      scrollRef.current.scrollTo({
        left: scrollWidth * currentSlide,
        behavior: "smooth",
      });
    }
  }, [currentSlide]);
 
  useEffect(() => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth / brands.length;
      scrollRef.current.scrollTo({
        left: scrollWidth * originalBrands.length,
        behavior: "auto",
      });
    }
  }, []);

  const handleDotClick = (index: number) => { 
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    const currentPosition = currentSlide % originalBrands.length;
    let targetSlide = currentSlide; 
    const diff = index - currentPosition;
    
    if (diff === 0) { 
      return;
    }
 
    targetSlide = currentSlide + diff; 
    if (targetSlide < 0) {
      targetSlide = originalBrands.length + index;
    } else if (targetSlide >= brands.length) {
      targetSlide = originalBrands.length + index;
    }

    setCurrentSlide(targetSlide); 
    setTimeout(() => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
      autoScrollTimer.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const next = prev + 1;
          if (next >= originalBrands.length * 2) {
            setTimeout(() => {
              if (scrollRef.current) {
                const scrollWidth = scrollRef.current.scrollWidth / brands.length;
                scrollRef.current.scrollTo({
                  left: scrollWidth * originalBrands.length,
                  behavior: "auto",
                });
              }
              setCurrentSlide(originalBrands.length);
            }, 300);
          }
          return next;
        });
      }, 4000);
    }, 5000);
  };
 
  const getActiveDot = () => {
    return currentSlide % originalBrands.length;
  };

  if (originalBrands.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4"> 
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {originalBrands.map((brand, index) => (
          <div
            key={index}
            className="overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105"
          >
            <div className="relative w-full h-48">
              <Image
                src={brand.image}
                alt={brand.alt}
                fill
                className="object-contain"
              />
            </div>
          </div>
        ))}
      </div> 
      <div className="md:hidden relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {brands.map((brand, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-full snap-center rounded-2xl overflow-hidden shadow-lg"
            >
              <div className="relative w-full h-48">
                <Image
                  src={brand.image}
                  alt={brand.alt}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div> 
        <div className="flex justify-center gap-2 mt-4">
          {originalBrands.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                getActiveDot() === index ? "w-8" : "w-2"
              }`}
              style={{
                backgroundColor:
                  getActiveDot() === index ? "var(--primary-teal)" : "#d1d5db",
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
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