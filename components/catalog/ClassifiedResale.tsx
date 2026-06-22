"use client";

import { useRef, useState, useEffect } from "react";
import { contentApi } from "@/lib/api/content";

type Listing = {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  location: string;
  image: string;
};

const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 1,
    title: "Royal Enfield Classic 350",
    subtitle: "2020 Model • 15,000 km",
    price: "₹1,45,000",
    location: "Coimbatore",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
  },
  {
    id: 2,
    title: "MacBook Pro M1 2020",
    subtitle: "Excellent Condition • Space Grey",
    price: "₹85,000",
    location: "Bangalore",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Teak Wood Sofa Set (3+2)",
    subtitle: "2 Years Old • Needs Polish",
    price: "₹12,500",
    location: "Puducherry",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Honda Activa 6G",
    subtitle: "2022 Model • 8,000 km",
    price: "₹65,000",
    location: "Chennai",
    image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400&h=300&fit=crop",
  },
  {
    id: 5,
    title: "iPhone 13 Pro Max",
    subtitle: "256GB • Sierra Blue • Like New",
    price: "₹72,000",
    location: "Hyderabad",
    image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Wooden Study Table",
    subtitle: "Solid Wood • With Chair",
    price: "₹8,500",
    location: "Madurai",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop",
  },
];

/* Sparkle positions for the dark panel */
const SPARKLES = [
  { top: "10%", left: "6%",  size: 2,   opacity: 0.6 },
  { top: "25%", left: "88%", size: 1.5, opacity: 0.4 },
  { top: "55%", left: "4%",  size: 1.5, opacity: 0.35 },
  { top: "70%", left: "90%", size: 2.5, opacity: 0.5 },
  { top: "85%", left: "50%", size: 1.5, opacity: 0.3 },
  { top: "40%", left: "75%", size: 2,   opacity: 0.4 },
];

function ListingCard({ item }: { item: Listing }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "18px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        width: "100%",
        boxShadow: hovered
          ? "0 14px 36px rgba(14,34,31,0.22)"
          : "0 3px 14px rgba(14,34,31,0.1)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease",
        cursor: "pointer",
        border: "1px solid rgba(14,34,31,0.08)",
      }}
    > 
      <div style={{
        width: "160px",
        minWidth: "160px",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #b2dfd6 0%, #d6f0ea 50%, #c5e8e0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}> 
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none", zIndex: 1,
        }} /> 
        {[
          { top:"12%", left:"8%",  size:3, opacity:0.7 },
          { top:"78%", left:"82%", size:2.5, opacity:0.55 },
          { top:"65%", left:"10%", size:2, opacity:0.45 },
        ].map((s, i) => (
          <div key={i} style={{
            position:"absolute", top:s.top, left:s.left,
            width:s.size, height:s.size, borderRadius:"50%",
            background:"#fff", opacity:s.opacity,
            boxShadow:`0 0 ${s.size*2}px ${s.size}px rgba(255,255,255,0.55)`,
            zIndex: 2,
          }} />
        ))}
        <img
          src={item.image}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.35s ease",
            transform: hovered ? "scale(1.06)" : "scale(1)",
            position: "relative",
            zIndex: 0,
          }}
        />
      </div>
 
      <div style={{
        flex: 1,
        background: "radial-gradient(ellipse at 65% 25%, #1a4a3a 0%, #0E221F 55%, #081812 100%)",
        padding: "20px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "150px",
        position: "relative",
        overflow: "hidden",
      }}> 
        {SPARKLES.map((s, i) => (
          <div key={i} style={{
            position: "absolute", top: s.top, left: s.left,
            width: s.size, height: s.size, borderRadius: "50%",
            background: "#fff", opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.45)`,
            pointerEvents: "none",
          }} />
        ))}
 
        <div style={{
          position: "absolute", top: "-20px", right: "-10px",
          width: "100px", height: "70px",
          background: "radial-gradient(ellipse, rgba(100,220,180,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} /> 
        <div style={{
          position: "absolute", top: "-35px", right: "-35px",
          width: "90px", height: "90px", borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-20px", left: "-20px",
          width: "60px", height: "60px", borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none",
        }} />
 
        <div style={{ zIndex: 1 }}>
          <p style={{
            margin: 0,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.95rem",
            lineHeight: 1.3, 
          }}>
            {item.title}
          </p>
          <p style={{
            margin: "5px 0 0",
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
            lineHeight: 1.4, 
            letterSpacing: "0.01em",
          }}>
            {item.subtitle}
          </p>
        </div>
 
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "12px",
          gap: "8px",
          zIndex: 1,
        }}>
          <p style={{
            margin: 0,
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.9rem", 
            letterSpacing: "-0.01em",
          }}>
            {item.price}
          </p>
 
          <span style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)",
            color: "#ffffff",
            border: "1px solid rgba(200,255,230,0.32)",
            borderRadius: "999px",
            padding: "4px 12px",
            fontSize: "0.73rem",
            fontWeight: 600, 
            whiteSpace: "nowrap",
            flexShrink: 0,
            backdropFilter: "blur(4px)",
            boxShadow: "0 0 10px rgba(100,220,170,0.15)",
            letterSpacing: "0.02em",
          }}>
             {item.location}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ClassifiedsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    contentApi.getClassified().then((items) => {
      if (items.length) {
        setListings(items.map((c) => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle ?? "",
          price: `₹${c.price.toLocaleString("en-IN")}`,
          location: c.location ?? "",
          image: c.image ?? "",
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const cardWidth = el.scrollWidth / listings.length;
      const index = Math.round(el.scrollLeft / cardWidth);
      setActiveDot(Math.min(index, listings.length - 1));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCard = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / listings.length;
    el.scrollTo({ left: cardWidth * index, behavior: "smooth" });
  };

  return (
    <div style={{
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "32px 20px", 
    }}>
      <style>{`
       
        .cl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .cl-mobile { display: none; }
        .cl-scroll::-webkit-scrollbar { display: none; }

        @media (min-width: 640px) and (max-width: 1023px) {
          .cl-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 14px; }
        }
        @media (max-width: 639px) {
          .cl-grid    { display: none !important; }
          .cl-mobile  { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "24px",
        gap: "12px",
      }}>
        <h2 style={{
          margin: 0,
          color: "#0E221F",
          fontWeight: 700,
          fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)",
          letterSpacing: "-0.01em", 
        }}>
          Classifieds &amp; Resale
        </h2>
 
  <button
  style={{
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(160deg, rgba(40,90,70,0.85) 0%, rgba(14,34,31,0.95) 50%, rgba(8,20,18,1) 100%)",
    color: "#d4fff0",
    border: "1.5px solid rgba(120,240,185,0.55)",
    borderRadius: "999px",
    padding: "9px 22px",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
    letterSpacing: "0.04em",
    boxShadow: ` 
      inset 0 1px 0px rgba(255,255,255,0.25),
      inset 0 -1.5px 0px rgba(0,0,0,0.4),
      inset 0 0 20px rgba(206, 255, 231, 0.06)
    `,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.2s ease",
  }} 
>  
  <span style={{
    position: "absolute", top: 0, left: "5%", right: "5%", height: "48%",
    borderRadius: "0 0 50% 50%",
    background: "linear-gradient(to bottom, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)",
    pointerEvents: "none", zIndex: 1,
  }} /> 
  <span style={{
    position: "absolute", bottom: 0, left: "15%", right: "15%", height: "30%",
    borderRadius: "50% 50% 0 0",
    background: "linear-gradient(to top, rgba(100,230,170,0.14) 0%, transparent 100%)",
    pointerEvents: "none", zIndex: 1,
  }} />
  <span style={{ position: "relative", zIndex: 2, textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>
    + Post an Ad
  </span>
</button>
      </div>

      {/* Desktop/Tablet Grid */}
      <div className="cl-grid">
        {listings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
 
      <div className="cl-mobile">
        <div
          ref={scrollRef}
          className="cl-scroll"
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            paddingBottom: "6px",
          }}
        >
          {listings.map((item) => (
            <div key={item.id} style={{
              scrollSnapAlign: "start",
              flexShrink: 0,
              width: "calc(100vw - 52px)",
              maxWidth: "360px",
            }}>
              <ListingCard item={item} />
            </div>
          ))}
        </div>
 
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          marginTop: "16px",
        }}>
          {listings.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              style={{
                height: "7px",
                width: activeDot === i ? "26px" : "7px",
                borderRadius: "999px",
                background: activeDot === i ? "#0E221F" : "#c8dbd8",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}