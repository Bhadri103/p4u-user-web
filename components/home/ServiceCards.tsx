"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { contentApi } from "@/lib/api/content";
import { resolveMediaUrl } from "@/lib/media";

import ambulance from "../../images/home-banner-bottom/ambulace.png";
import help from "../../images/home-banner-bottom/help.png";
import urgent from "../../images/home-banner-bottom/urgent.png";
import type { StaticImageData } from "next/image";

interface CardType {
  id: number | string;
  label: string;
  image: StaticImageData | string;
  imageBg: string;
  icon: string;
  desc: string;
}
interface CardInnerProps {
  card: CardType;
  mobile: boolean;
}

const BG_COLORS = [
  "linear-gradient(135deg, #b2dfd6 0%, #d6f0ea 50%, #c5e8e0 100%)",
  "linear-gradient(135deg, #fde8c0 0%, #fff5e0 50%, #fde8c0 100%)",
  "linear-gradient(135deg, #b8d4ed 0%, #dceefa 50%, #b8d4ed 100%)",
];

const FALLBACK_CARDS: CardType[] = [
  {
    id: 1,
    label: "Emergency",
    image: ambulance,
    imageBg: BG_COLORS[0],
    icon: "🚑",
    desc: "Immediate response, anytime",
  },
  {
    id: 2,
    label: "Urgent",
    image: urgent,
    imageBg: BG_COLORS[1],
    icon: "⚡",
    desc: "Fast-track priority care",
  },
  {
    id: 3,
    label: "Help",
    image: help,
    imageBg: BG_COLORS[2],
    icon: "🤝",
    desc: "We're always here for you",
  },
];

const SPARKLES = [
  { top: "12%",  left: "8%",  size: 2.5, opacity: 0.7 },
  { top: "22%",  left: "88%", size: 2,   opacity: 0.5 },
  { top: "45%",  left: "5%",  size: 1.5, opacity: 0.4 },
  { top: "60%",  left: "92%", size: 3,   opacity: 0.6 },
  { top: "75%",  left: "15%", size: 2,   opacity: 0.5 },
  { top: "85%",  left: "75%", size: 1.5, opacity: 0.35 },
  { top: "30%",  left: "50%", size: 1.5, opacity: 0.3 },
  { top: "90%",  left: "42%", size: 2,   opacity: 0.4 },
];

const IMG_SPARKLES = [
  { top:"14%", left:"10%", size:4,   opacity:0.8 },
  { top:"80%", left:"80%", size:3,   opacity:0.6 },
  { top:"70%", left:"12%", size:2.5, opacity:0.5 },
  { top:"20%", left:"82%", size:3,   opacity:0.7 },
];

function CardInner({ card, mobile }: CardInnerProps) {
  const imgPct  = mobile ? "40%" : "44%";
  const padR    = mobile ? "1rem 1rem 1rem 1.15rem" : "1.6rem 1.3rem";
  const badgeSize = mobile ? "38px" : "48px";
  const badgeFont = mobile ? "1.1rem" : "1.4rem";
  const titleSize = mobile ? "0.78rem" : "clamp(0.9rem,1.5vw,1.15rem)";
  const subSize   = mobile ? "0.68rem" : "clamp(0.72rem,1.1vw,0.9rem)";
  const descSize  = mobile ? "0" : "clamp(0.62rem,0.9vw,0.75rem)";  
  const btnPad    = mobile ? "0.38rem 1.1rem" : "0.5rem 1.6rem";
  const btnFont   = mobile ? "0.72rem" : "clamp(0.75rem,1.1vw,0.92rem)";
  const gap       = mobile ? "0.35rem" : "0.55rem";

  return (
    <div style={{ display:"flex", flexDirection:"row", width:"100%", height:"100%" }}>
 
      <div style={{
        width: imgPct,
        flexShrink: 0,
        background: card.imageBg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}> 
        <div style={{
          position:"absolute", width:"90%", height:"90%", borderRadius:"50%",
          background:"radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
          top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none",
        }} /> 
        {IMG_SPARKLES.map((s,i) => (
          <div key={i} style={{
            position:"absolute", top:s.top, left:s.left,
            width:s.size, height:s.size, borderRadius:"50%",
            background:"#fff", opacity:s.opacity,
            boxShadow:`0 0 ${s.size*2}px ${s.size}px rgba(255,255,255,0.6)`,
          }} />
        ))}
        <div className="ec-img-wrap" style={{ position:"relative", width:"85%", height:"85%", zIndex:2 }}>
          <Image src={card.image} alt={card.label} fill
            style={{ objectFit:"contain", objectPosition:"center" }}
            sizes="(max-width:768px) 42vw, 200px"
          />
        </div>
      </div>
 
      <div style={{
        flex:1,
        background:"radial-gradient(ellipse at 60% 25%, #1a4a3a 0%, #0E221F 55%, #081812 100%)",
        position:"relative", overflow:"hidden",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding: padR, gap,
      }}> 
        {SPARKLES.map((s,i) => (
          <div key={i} style={{
            position:"absolute", top:s.top, left:s.left,
            width:s.size, height:s.size, borderRadius:"50%",
            background:"#fff", opacity:s.opacity,
            boxShadow:`0 0 ${s.size*2}px rgba(255,255,255,0.5)`,
            pointerEvents:"none",
          }} />
        ))} 
        <div style={{
          position:"absolute", top:"-10px", left:"50%", transform:"translateX(-50%)",
          width:"130px", height:"90px",
          background:"radial-gradient(ellipse, rgba(100,220,180,0.2) 0%, transparent 70%)",
          pointerEvents:"none",
        }} />
 
        <div style={{
          width:badgeSize, height:badgeSize,
          borderRadius:"50%",
          background:"linear-gradient(135deg, #1e5c48 0%, #0E221F 100%)",
          border:"2px solid rgba(100,220,170,0.4)",
          boxShadow:"0 0 20px rgba(80,200,150,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:badgeFont, flexShrink:0, zIndex:1,
        }}>
          {card.icon}
        </div>

        <p style={{
          margin:0, color:"#ffffff",
          fontFamily:"'DM Serif Display', serif",
          fontWeight:700, fontSize:titleSize,
          textAlign:"center", lineHeight:1.25, zIndex:1,
        }}>
          Take a breath.
        </p>
 
        <p style={{
          margin:0, color:"rgba(255,255,255,0.85)",
          fontFamily:"'DM Serif Display', serif",
          fontStyle:"italic", fontSize:subSize,
          textAlign:"center", lineHeight:1.35, zIndex:1,
        }}>
          We&apos;ll assist you any time.
        </p>
 
        {!mobile && (
          <p style={{
            margin:0, color:"rgba(255,255,255,0.42)",
            fontFamily:"'DM Sans', sans-serif",
            fontSize:descSize, textAlign:"center",
            letterSpacing:"0.02em", zIndex:1,
          }}>
            {card.desc}
          </p>
        )}
 
        <button className="ec-btn" style={{
          background:"linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.07) 100%)",
          color:"#ffffff",
          border:"1.5px solid rgba(200,255,230,0.35)",
          borderRadius:"999px",
          padding:btnPad,
          fontWeight:600, fontSize:btnFont,
          cursor:"pointer",
          fontFamily:"'DM Sans', sans-serif",
          display:"flex", alignItems:"center", gap:"0.45rem",
          backdropFilter:"blur(6px)",
          boxShadow:"0 0 18px rgba(100,220,170,0.22), 0 2px 12px rgba(0,0,0,0.3)",
          whiteSpace:"nowrap", zIndex:1, letterSpacing:"0.02em",
        }}>
          {card.label}
          <span style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:"17px", height:"17px", borderRadius:"50%",
            background:"rgba(255,255,255,0.15)",
            fontSize:"0.68rem",
            border:"1px solid rgba(255,255,255,0.2)",
          }}>›</span>
        </button>
      </div>
    </div>
  );
}

export default function EmergencyCards() {
  const [cards, setCards] = useState<CardType[]>([]);

  useEffect(() => {
    contentApi.getServiceHighlights().then((items) => {
      if (items.length) {
        setCards(items.map((sh, i) => ({
          id: sh.id,
          label: sh.title,
          image: sh.imageUrl ? (resolveMediaUrl(sh.imageUrl) || sh.imageUrl) : ambulance,
          imageBg: BG_COLORS[i % BG_COLORS.length],
          icon: sh.iconUrl || ["🚑", "⚡", "🤝"][i % 3],
          desc: sh.description || "",
        })));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="w-full py-8 px-4 xl:px-6 max-w-[1400px] mx-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');
        .ec-card {
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease;
        }
        .ec-card:hover {
          transform: translateY(-4px) scale(1.008);
          box-shadow: 0 14px 32px rgba(14,34,31,0.14) !important;
        }
        .ec-btn {
          transition: all 0.22s ease;
        }
        .ec-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 0 14px rgba(100,220,170,0.25), 0 2px 10px rgba(0,0,0,0.22) !important;
          border-color: rgba(200,255,230,0.55) !important;
        }
        .ec-img-wrap { transition: transform 0.4s ease; }
        .ec-card:hover .ec-img-wrap { transform: scale(1.04); }
      `}</style>

      <div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:flex gap-5 flex-nowrap">
          {cards.map((card) => (
            <div key={card.id} className="ec-card flex-1 min-w-0" style={{
              borderRadius:"22px", overflow:"hidden", minHeight:"215px",
              boxShadow:"0 3px 14px rgba(14,34,31,0.1)", cursor:"pointer",
              border:"1px solid rgba(14,34,31,0.06)",
            }}>
              <CardInner card={card} mobile={false} />
            </div>
          ))}
        </div> 
        <div className="flex md:hidden" style={{ gap:"8px", flexWrap:"nowrap" }}>
          {cards.map((card) => (
            <div key={card.id} className="ec-card" style={{
              flex:"1 1 0", minWidth:0,
              borderRadius:"16px", overflow:"hidden",
              boxShadow:"0 3px 12px rgba(14,34,31,0.1)", cursor:"pointer",
              border:"1px solid rgba(14,34,31,0.06)",
              display:"flex", flexDirection:"column",
            }}> 
              <div style={{
                background: card.imageBg,
                position:"relative", overflow:"hidden",
                display:"flex", alignItems:"center", justifyContent:"center",
                aspectRatio:"1/1",
                flexShrink:0,
              }}>
                <div style={{
                  position:"absolute", width:"90%", height:"90%", borderRadius:"50%",
                  background:"radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
                  top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none",
                }} />
                {IMG_SPARKLES.map((s,i) => (
                  <div key={i} style={{
                    position:"absolute", top:s.top, left:s.left,
                    width:s.size, height:s.size, borderRadius:"50%",
                    background:"#fff", opacity:s.opacity,
                    boxShadow:`0 0 ${s.size*2}px ${s.size}px rgba(255,255,255,0.6)`,
                  }} />
                ))}
                <div className="ec-img-wrap" style={{ position:"relative", width:"82%", height:"82%", zIndex:2 }}>
                  <Image src={card.image} alt={card.label} fill
                    style={{ objectFit:"contain" }} sizes="33vw"
                  />
                </div>
              </div> 
              <div style={{
                flex:1,
                background:"radial-gradient(ellipse at 60% 20%, #1a4a3a 0%, #0E221F 55%, #081812 100%)",
                position:"relative", overflow:"hidden",
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                padding:"0.6rem 0.4rem 0.75rem",
                gap:"0.38rem",
              }}> 
                {SPARKLES.slice(0,5).map((s,i) => (
                  <div key={i} style={{
                    position:"absolute", top:s.top, left:s.left,
                    width:s.size, height:s.size, borderRadius:"50%",
                    background:"#fff", opacity:s.opacity,
                    boxShadow:`0 0 ${s.size*2}px rgba(255,255,255,0.5)`,
                    pointerEvents:"none",
                  }} />
                ))}

               
                <button className="ec-btn" style={{
                  background:"linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.07) 100%)",
                  color:"#ffffff",
                  border:"1px solid rgba(200,255,230,0.35)",
                  borderRadius:"999px",
                  padding:"0.28rem 0.6rem",
                  fontWeight:600, fontSize:"0.58rem",
                  cursor:"pointer",
                  fontFamily:"'DM Sans', sans-serif",
                  display:"flex", alignItems:"center", gap:"0.25rem",
                  backdropFilter:"blur(6px)",
                  boxShadow:"0 0 12px rgba(100,220,170,0.2)",
                  whiteSpace:"nowrap", zIndex:1,
                }}>
                  {card.label} ›
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}