"use client";

import { useState, useEffect, useRef } from "react";
import { contentApi } from "@/lib/api/content";

interface Product {
  id: number;
  username: string;
  caption: string;
  video: string;
}

const FALLBACK_PRODUCTS: Product[] = [
  { id: 1, username: "@style_icon",  caption: "Summer vibes ✨",   video: "/video/vid1.mp4" },
  { id: 2, username: "@tech_guru",   caption: "Unboxing the ...",  video: "/video/vid2.mp4" },
  { id: 3, username: "@foodie_life", caption: "Delicious! 🍕",     video: "/video/vid3.mp4" },
  { id: 4, username: "@wanderlust",  caption: "Mountain view 🏔",  video: "/video/vid4.mp4" },
  { id: 5, username: "@fit_fam",     caption: "Morning routine",   video: "/video/vid5.mp4" },
  { id: 6, username: "@creator_hub", caption: "New drop 🔥",       video: "/video/vid6.mp4" },
  { id: 7, username: "@style_icon",  caption: "Summer vibes ✨",   video: "/video/vid1.mp4" },
  { id: 8, username: "@tech_guru",   caption: "Unboxing the ...",  video: "/video/vid2.mp4" },
];
 
function VideoModal({ item, onClose }: { item: Product; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null); 
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey); 
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
 
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          // Fallback if autoplay with sound blocked
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
    }
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeInBg 0.25s ease",
      }}
    > 
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(92vw, 400px)",
          aspectRatio: "9/16",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
          animation: "scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <video
          ref={videoRef}
          src={item.video}
          loop
          playsInline
          controls
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#000",
          }}
        />
 
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 16px 20px",
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        >
          <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: "0.92rem", fontFamily: "'Segoe UI', sans-serif" }}>
            {item.username}
          </p>
          <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.8)", fontSize: "0.82rem", fontFamily: "'Segoe UI', sans-serif" }}>
            {item.caption}
          </p>
        </div>
 
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            backdropFilter: "blur(6px)",
            zIndex: 10,
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes fadeInBg  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn   { from { transform: scale(0.82); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}
 
function VideoCard({ item, onOpen }: { item: Product; onOpen: (item: Product) => void }) {
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
        background: "#111",
        aspectRatio: "9/16",
        width: "100%",
      }}
      className="video-card"
    > 
      <video
        src={item.video}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
 
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
 
      <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 3 }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <circle cx="15" cy="15" r="14" stroke="white" strokeWidth="1.5" />
          <polygon points="12,9.5 22,15 12,20.5" fill="white" />
        </svg>
      </div> 
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 14px 16px",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <p style={{ margin: 0, color: "#ffffff", fontWeight: 700, fontSize: "0.82rem", fontFamily: "'Segoe UI', sans-serif" }}>
          {item.username}
        </p>
        <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.8)", fontSize: "0.74rem", fontFamily: "'Segoe UI', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.caption}
        </p>
      </div>
    </div>
  );
} 
interface Sparkle {
  top: string;
  left: string;
  size: number;
  opacity: number;
}

const BG_SPARKLES: Sparkle[] = [
  { top:"4%",   left:"3%",   size:2.5, opacity:0.6 },
  { top:"8%",   left:"70%",  size:1.5, opacity:0.4 },
  { top:"10%",  left:"38%",  size:1,   opacity:0.3 },
  { top:"12%",  left:"92%",  size:2,   opacity:0.45 },
  { top:"15%",  left:"82%",  size:1,   opacity:0.25 },
  { top:"18%",  left:"55%",  size:3,   opacity:0.4 },
  { top:"20%",  left:"10%",  size:1,   opacity:0.3 },
  { top:"25%",  left:"18%",  size:1.5, opacity:0.35 },
  { top:"28%",  left:"62%",  size:1,   opacity:0.2 },
  { top:"32%",  left:"96%",  size:1.5, opacity:0.35 },
  { top:"35%",  left:"78%",  size:2,   opacity:0.5 },
  { top:"38%",  left:"30%",  size:1,   opacity:0.25 },
  { top:"42%",  left:"35%",  size:2,   opacity:0.25 },
  { top:"46%",  left:"72%",  size:1,   opacity:0.3 },
  { top:"50%",  left:"8%",   size:1.5, opacity:0.3 },
  { top:"52%",  left:"50%",  size:1,   opacity:0.2 },
  { top:"55%",  left:"45%",  size:2.5, opacity:0.35 },
  { top:"58%",  left:"20%",  size:1,   opacity:0.25 },
  { top:"62%",  left:"85%",  size:1,   opacity:0.3 },
  { top:"65%",  left:"88%",  size:2,   opacity:0.45 },
  { top:"68%",  left:"40%",  size:1,   opacity:0.2 },
  { top:"72%",  left:"25%",  size:1.5, opacity:0.3 },
  { top:"75%",  left:"58%",  size:1,   opacity:0.25 },
  { top:"78%",  left:"5%",   size:1,   opacity:0.3 },
  { top:"80%",  left:"65%",  size:3,   opacity:0.4 },
  { top:"84%",  left:"48%",  size:1,   opacity:0.2 },
  { top:"88%",  left:"12%",  size:2,   opacity:0.5 },
  { top:"90%",  left:"75%",  size:1,   opacity:0.3 },
  { top:"92%",  left:"80%",  size:1.5, opacity:0.35 },
  { top:"95%",  left:"33%",  size:1,   opacity:0.25 },
];
 
export default function BestProducts() {
  const [activeItem, setActiveItem] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    contentApi.getReels().then((reels) => {
      if (reels.length) {
        setProducts(reels.map((r) => ({
          id: r.id,
          username: r.username ?? "@user",
          caption: r.caption ?? "",
          video: r.videoUrl,
        })));
      }
    }).catch(() => {});
  }, []);

  return (
    <div  
      style={{
      
     
        maxWidth: "1400px",
        margin: "0 auto",
      
        fontFamily: "'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
        borderRadius:"20px"
      }}
      className="best-products-wrapper px-3 sm:px-4 md:px-6"
    >
    <div
      style={{
  background: "#009999",
        padding: "28px 24px 32px",
        maxWidth: "1400px",
     
        fontFamily: "'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
        borderRadius:"20px"
      }}
      className="best-products-wrapper"
    > 
      {BG_SPARKLES.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          top: s.top, left: s.left,
          width: s.size, height: s.size,
          borderRadius: "50%",
          background: "#ffffff",
          opacity: s.opacity,
          boxShadow: `0 0 ${s.size * 2.5}px ${s.size}px rgba(255,255,255,0.45)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      ))} 
      <div style={{
        position: "absolute", top: "-30px", left: "50%",
        transform: "translateX(-50%)",
        width: "400px", height: "180px",
        background: "radial-gradient(ellipse, rgba(100,220,180,0.14) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <h2
        style={{
          margin: "0 0 24px",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)",
          letterSpacing: "-0.01em",
          position: "relative",
          zIndex: 1,
        }}
      >
          Explore Moments
      </h2> 
      <div
        className="videos-desktop"
        style={{ display: "flex", gap: "14px", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "4px", position: "relative", zIndex: 1 }}
      >
        {products.map((item) => (
          <div key={item.id} style={{ flexShrink: 0, width: "clamp(140px, 15vw, 220px)" }}>
            <VideoCard item={item} onOpen={setActiveItem} />
          </div>
        ))}
      </div>
 
      <div className="videos-mobile" style={{ display: "none", overflowY: "auto", maxHeight: "560px", scrollbarWidth: "none", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          {products.map((item) => (
            <VideoCard key={item.id} item={item} onOpen={setActiveItem} />
          ))}
        </div>
      </div>
 
      {activeItem && (
        <VideoModal item={activeItem} onClose={() => setActiveItem(null)} />
      )}

      <style>{`
        .videos-desktop::-webkit-scrollbar { display: none; }
        .videos-mobile::-webkit-scrollbar  { display: none; }
        .video-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .video-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 14px 36px rgba(0,0,0,0.5); }
        @media (max-width: 639px) {
          .videos-desktop { display: none !important; }
          .videos-mobile  { display: block !important; }
          .best-products-wrapper { padding: 18px 14px 22px; border-radius: 16px; }
        }
      `}</style>
    </div>
    </div>
  );
}