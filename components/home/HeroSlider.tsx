"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import banner1 from "../../images/home-banner/banner1.png";
import banner2 from "../../images/home-banner/banner2.jpg";
import banner3 from "../../images/home-banner/banner3.png";
import { contentApi } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";

type HeroSlide = {
  image: any;
  mobileImage?: string;
  alt: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  festivalTag?: string;
  themeHeaderColor?: string;
  themeBgColor?: string;
  themeButtonColor?: string;
  backgroundGradient?: string;
};

const FALLBACK_SLIDES = [
  { image: banner1, alt: "Banner" },
  { image: banner2, alt: "Banner" },
  { image: banner3, alt: "Banner" },
];

function isBannerLive(startDate?: string, endDate?: string): boolean {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : NaN;
  const end = endDate ? new Date(endDate).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

function normalizeCtaLink(
  redirectType?: string,
  ctaLink?: string,
  redirectUrl?: string,
  redirectId?: string,
): string | undefined {
  const link = String(ctaLink || redirectUrl || "").trim();
  if (link) return link;
  if (String(redirectType || "").toLowerCase() === "internal" && String(redirectId || "").trim()) {
    return `/${encodeURIComponent(String(redirectId).trim())}`;
  }
  return undefined;
}

function resolveBannerImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return resolveMediaUrl(t) || t;
}

export default function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>(FALLBACK_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [slidePosition, setSlidePosition] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    contentApi.getBanners().then((banners) => {
      if (banners.length) {
        const cmsHero = banners
          .filter((b) => {
            const m = b.metadata || {};
            if (m.homepageCMS !== true) return false;
            if ((m.cmsSlot || "hero") !== "hero") return false;
            if ((m.mediaType || "image") !== "image") return false;
            return isBannerLive(m.startDate, m.endDate);
          })
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((b) => {
            const m = b.metadata || {};
            return {
              image: (resolveBannerImageUrl(m.desktopImageUrl || b.imageUrl || b.image) || (m.desktopImageUrl || b.imageUrl || b.image)) as any,
              mobileImage: resolveBannerImageUrl(m.mobileImageUrl) || m.mobileImageUrl || undefined,
              alt: b.title ?? "Banner",
              subtitle: m.subtitle || undefined,
              ctaText: m.ctaText || undefined,
              ctaLink: normalizeCtaLink(m.redirectType, m.ctaLink, b.redirectUrl, m.redirectId),
              festivalTag: m.festivalTag || undefined,
              themeHeaderColor: m.themeHeaderColor || undefined,
              themeBgColor: m.themeBgColor || undefined,
              themeButtonColor: m.themeButtonColor || undefined,
              backgroundGradient: m.backgroundGradient || undefined,
            } as HeroSlide;
          })
          .filter((s) => Boolean(s.image));

        const fallbackApi = banners
          .map((b) => ({ image: (resolveBannerImageUrl(b.imageUrl || b.image) || (b.imageUrl || b.image)) as any, alt: b.title ?? "Banner" }))
          .filter((s) => Boolean(s.image));

        setSlides(cmsHero.length ? cmsHero : (fallbackApi.length ? fallbackApi : FALLBACK_SLIDES));
        setCurrentSlide(0);
        setSlidePosition(0);
      }
    }).catch(() => {});
  }, []);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setSlidePosition((prev) => prev - 100);
    setCurrentSlide((prev) => {
      const len = slides.length;
      if (len < 1) return 0;
      return (prev + 1) % len;
    });
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    setSlidePosition((prev) => prev + 100);
    setCurrentSlide((prev) => {
      const len = slides.length;
      if (len < 1) return 0;
      return (prev - 1 + len) % len;
    });
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, nextSlide]);

  useEffect(() => {
    const n = slides.length;
    if (n < 1) return;
    const wrap = n * 100;
    if (currentSlide === 0 && slidePosition <= -wrap) {
      const t = setTimeout(() => {
        setIsTransitioning(false);
        setSlidePosition(0);
      }, 700);
      return () => clearTimeout(t);
    }
    if (currentSlide === n - 1 && slidePosition >= 0 && slidePosition > -100) {
      const t = setTimeout(() => {
        setIsTransitioning(false);
        setSlidePosition(-(n - 1) * 100);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [currentSlide, slidePosition, slides.length]);

  if (slides.length === 0) {
    return (
      <div className="w-full mx-auto max-w-[1400px] px-4 xl:px-6 mt-2 sm:mt-3 md:mt-4">
        <div className="h-[180px] xs:h-[200px] sm:h-[250px] md:h-[320px] lg:h-[400px] xl:h-[450px] bg-gray-100 rounded-lg sm:rounded-xl md:rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden mx-auto max-w-[1400px] px-4 xl:px-6 mt-2 sm:mt-3 md:mt-4">
      <div className="relative h-[180px] xs:h-[200px] sm:h-[250px] md:h-[320px] lg:h-[400px] xl:h-[450px] bg-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden">
 
        <div
          className={`flex h-full ${isTransitioning ? 'transition-transform duration-700 ease-in-out' : ''}`}
          style={{ transform: `translateX(${slidePosition}%)` }}
        >
           {[...slides, ...slides].map((slide, index) => (
            <div
              key={index}
              className="min-w-full h-full relative flex-shrink-0"
              style={{
                backgroundColor: slide.themeBgColor || undefined,
                background: slide.backgroundGradient || undefined,
              }}
            >
              <Image
                src={isMobile && slide.mobileImage ? slide.mobileImage : slide.image}
                alt={slide.alt}
                fill
                priority={index === 0}
                className="object-cover object-top rounded-lg sm:rounded-xl md:rounded-2xl"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1400px"
              />
              {(slide.subtitle || slide.ctaText || slide.festivalTag) && (
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-6 bg-gradient-to-t from-black/55 to-transparent">
                  {slide.festivalTag && (
                    <span className="inline-block mb-2 px-2 py-1 rounded-full text-xs font-medium bg-white/85 text-gray-900">
                      {slide.festivalTag}
                    </span>
                  )}
                  {slide.subtitle && (
                    <p className="text-white text-xs sm:text-sm md:text-base mb-2" style={{ color: slide.themeHeaderColor || undefined }}>
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.ctaText && slide.ctaLink && (
                    <a
                      href={slide.ctaLink}
                      target={slide.ctaLink.startsWith("http") ? "_blank" : "_self"}
                      rel={slide.ctaLink.startsWith("http") ? "noreferrer" : undefined}
                      className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: slide.themeButtonColor || "#ffffff",
                        color: "#111827",
                      }}
                    >
                      {slide.ctaText}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

         <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 z-20 shadow-md transition-all duration-200 active:scale-95"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-800" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 sm:p-2 z-20 shadow-md transition-all duration-200 active:scale-95"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-800" />
        </button>

         <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const diff = index - currentSlide;
                setIsTransitioning(true);
                setSlidePosition((prev) => prev - (diff * 100));
                setCurrentSlide(index);
              }}
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "bg-white w-6 sm:w-8"
                  : "bg-white/50 w-1.5 sm:w-2"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}