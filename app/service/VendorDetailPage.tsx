"use client"; 
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import ServiceBookingModal from "@/components/booking/ServiceBookingModal";
import { TEAL, TEAL_GRAD, TEAL_DARK, BannerSlide, Vendor, Product } from "./serviceData";
import { catalogApi, type Vendor as CatalogVendor, type ServiceItem as CatalogServiceItem } from "@/lib/api/catalog";
import { commerceApi } from "@/lib/api/commerce";
import { pickServiceImage, pickVendorImage } from "@/lib/media";
const IC = {
  Star:      ({ fill="#f59e0b",size=13 }:{ fill?:string;size?:number })=><svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  MapPin:    ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clock:     ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Search:    ()=><svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ChevLeft:  ({ color="currentColor",size=16 }:{ color?:string;size?:number })=><svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight: ({ color="currentColor",size=16 }:{ color?:string;size?:number })=><svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  X:         ({ size=10 }:{ size?:number })=><svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Filter:    ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Heart:     ({ filled }:{ filled:boolean })=><svg width="14" height="14" fill={filled?"#ef4444":"none"} stroke={filled?"#ef4444":"#9ca3af"} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Phone:     ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  Mail:      ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Check:     ()=><svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#10b981" strokeWidth="2"/><polyline points="22 4 12 14.01 9 11.01" stroke="#10b981" strokeWidth="2"/></svg>,
  Plus:      ()=><svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus:     ()=><svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Tag:       ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Info:      ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Gallery:   ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Zap:       ()=><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};
 
function Checkbox({ checked,onChange,accent=TEAL }:{ checked:boolean;onChange:()=>void;accent?:string }) {
  return (
    <div onClick={onChange} style={{ width:15,height:15,borderRadius:3,border:`2px solid ${checked?accent:"#d1d5db"}`,background:checked?accent:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"all .15s" }}>
      {checked&&<svg width="8" height="8" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}
 
function BannerCarousel({ banners, vendorName }:{ banners:BannerSlide[]; vendorName:string }) {
  const [current,    setCurrent]    = useState(0);
  const [isAnimating,setIsAnimating]= useState(false);
  const [paused,     setPaused]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = banners.length;
  
  const goTo = useCallback((idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(idx); 
    setTimeout(() => setIsAnimating(false), 620);
  }, [isAnimating]);

  const goNext = useCallback(() => goTo((current + 1) % total), [goTo, current, total]);
  const goPrev = useCallback(() => goTo((current - 1 + total) % total), [goTo, current, total]);
 
  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(goNext, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [goNext, total, paused]);

  const slide = banners[current];

  return (
    <div
      style={{ position:"relative", width:"100%", height:200, borderRadius:16, overflow:"hidden", marginBottom:16 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    > 
      <div
        style={{
          display:           "flex",
          width:             `${total * 100}%`,
          height:            "100%",
          transform:         `translateX(${(-current * 100) / total}%)`,
          transition:        isAnimating
                               ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                               : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange:        "transform",
        }}
      >
        {banners.map((slide, i) => (
          <div
            key={i}
            style={{
              width:    `${100 / total}%`,
              flexShrink: 0,
              height:   "100%",
              position: "relative",
              background: slide.gradient,
              overflow: "hidden",
            }}
          >
            <SlideContent slide={slide} vendorName={vendorName} />
          </div>
        ))}
      </div> 
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:20, background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", transition:"background .2s" }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.35)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)"}
        >
          <IC.ChevLeft color="white" size={14} />
        </button>
      )}
 
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:20, background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)", transition:"background .2s" }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.35)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)"}
        >
          <IC.ChevRight color="white" size={14} />
        </button>
      )} 
      {total > 1 && (
        <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6, zIndex:20 }}>
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                height:     5,
                borderRadius: 3,
                border:     "none",
                cursor:     "pointer",
                padding:    0,
                transition: "width .35s, background .35s, box-shadow .35s",
                width:      i === current ? 22 : 6,
                background: i === current ? slide.accent : "rgba(255,255,255,0.4)",
                boxShadow:  i === current ? `0 0 8px ${slide.accent}` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
} 
function SlideContent({ slide, vendorName }:{ slide:BannerSlide; vendorName:string }) {
  return (
    <> 
      <div style={{ position:"absolute", inset:0, opacity:0.12, pointerEvents:"none",
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 38px,${slide.accent}44 38px,${slide.accent}44 39px),
                         repeating-linear-gradient(90deg,transparent,transparent 38px,${slide.accent}44 38px,${slide.accent}44 39px)` }} />
     
      <div style={{ position:"absolute", right:"5%", top:"5%", width:"45%", height:"90%", pointerEvents:"none",
        background:`radial-gradient(circle,${slide.accent}28 0%,transparent 70%)`, borderRadius:"50%" }} />
      
      <div style={{ position:"absolute", right:"10%", top:"50%", transform:"translateY(-50%)", width:120, height:120, pointerEvents:"none",
        background:"rgba(255,255,255,0.08)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>
        {slide.icon}
      </div>
      
      <div style={{ position:"absolute", top:14, right:14, background:slide.accent, color:"#fff", fontSize:11, fontWeight:800,
        padding:"6px 14px", borderRadius:20, letterSpacing:"0.06em", textTransform:"uppercase",
        boxShadow:`0 4px 16px ${slide.accent}66`, border:"1.5px solid rgba(255,255,255,0.3)" }}>
        {slide.badgeText}
      </div>
   
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ fontSize:10, color:slide.accent, fontWeight:600, marginBottom:6, opacity:0.85, letterSpacing:"0.04em" }}>
          {slide.handle}
        </div>
        <div style={{ fontSize:30, fontWeight:900, color:"#fff", lineHeight:1.05, marginBottom:14,
          textTransform:"uppercase", letterSpacing:"-0.5px", textShadow:`0 0 40px ${slide.accent}55` }}>
          {slide.title.split("\n").map((line, i) => <div key={i}>{line}</div>)}
        </div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${slide.accent}22`,
          border:`1px solid ${slide.accent}55`, borderRadius:20, padding:"7px 18px", backdropFilter:"blur(4px)", width:"fit-content" }}>
          <IC.Zap />
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{slide.subtitle}</span>
        </div>
      </div>
    </>
  );
}
 
function VendorLogo({ vendor }: { vendor: Vendor }) {
  const boxStyle = {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: vendor.logoColor,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 30,
    flexShrink: 0,
    boxShadow: `0 4px 16px ${vendor.logoColor}44`,
    border: `2px solid ${vendor.logoColor}66`,
    overflow: "hidden" as const,
  };
  const logo = vendor.logo || "";
  if (logo.startsWith("http") || logo.startsWith("/")) {
    return (
      <div style={boxStyle}>
        <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return <div style={boxStyle}>{logo || "🏪"}</div>;
}

function VendorInfoCard({
  vendor,
  onBookNow,
  bookNowLabel,
}: {
  vendor: Vendor;
  onBookNow?: () => void;
  bookNowLabel?: string;
}) {
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"16px 20px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f0f0f0" }}>
      <div style={{ display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap" }}>
         <VendorLogo vendor={vendor}/>
     <div style={{ flex:1,minWidth:220 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
            <h2 style={{ fontSize:18,fontWeight:800,color:"#111827",margin:0 }}>{vendor.name}</h2>
            {vendor.verified&&<IC.Check/>}
          </div>
          <p style={{ fontSize:12,color:"#6b7280",margin:"0 0 10px",lineHeight:1.55,maxWidth:480 }}>{vendor.description}</p>
           <div style={{ display:"flex",flexWrap:"wrap",gap:0 }}>
            {[
              { label:"Seller Since", value:vendor.since },
              { label:"Open Hours",   value:vendor.openHours },
              { label:"Distance",     value:vendor.distance },
              { label:"Rating",       value:null },
            ].map((item,i,arr)=>(
              <div key={item.label} style={{ display:"flex",alignItems:"stretch",paddingRight:i<arr.length-1?16:0 }}>
                <div>
                  <div style={{ fontSize:10,color:"#9ca3af",marginBottom:2 }}>{item.label}</div>
                  {item.value
                    ?<div style={{ fontSize:12,fontWeight:700,color:"#111827",whiteSpace:"nowrap" }}>{item.value}</div>
                    :<div style={{ display:"flex",alignItems:"center",gap:4 }}><IC.Star size={12}/><span style={{ fontSize:12,fontWeight:700,color:"#111827" }}>{vendor.rating}/5</span><span style={{ fontSize:10,color:"#9ca3af" }}>({vendor.totalRatings})</span></div>}
                </div>
                {i<arr.length-1&&<div style={{ width:1,background:"#e5e7eb",margin:"0 12px",alignSelf:"stretch" }}/>}
              </div>
            ))}
          </div>
           <div style={{ display:"flex",gap:8,marginTop:12 }}>
            <button
              type="button"
              onClick={onBookNow}
              style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:TEAL_GRAD,border:"none",borderRadius:20,color:"#fff",fontSize:12,fontWeight:700,cursor:onBookNow?"pointer":"default",boxShadow:"0 4px 12px rgba(13,148,136,0.35)",opacity:onBookNow?1:0.85 }}
            >
              <IC.Phone/> {bookNowLabel ?? "Book service"}
            </button>
          </div>
        </div>
 
        <div style={{ flexShrink:0,minWidth:200,borderLeft:"1px solid #f0f0f0",paddingLeft:20 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"#374151",marginBottom:10 }}>Contact Details</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12 }}><span style={{ color:"#059669" }}><IC.Phone/></span><span style={{ color:"#374151" }}>{vendor.phone}</span></div>
            <div style={{ display:"flex",alignItems:"center",gap:8,fontSize:12 }}><span style={{ color:"#3b82f6" }}><IC.Mail/></span><span style={{ color:"#374151",fontSize:11 }}>{vendor.email}</span></div>
            <div style={{ display:"flex",alignItems:"flex-start",gap:8,fontSize:12 }}><span style={{ color:"#ef4444",marginTop:1 }}><IC.MapPin/></span><span style={{ color:"#374151",fontSize:11,lineHeight:1.4 }}>{vendor.address}</span></div>
          </div>
          <div style={{ display:"flex",gap:8,marginTop:12 }}>
            <button style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:TEAL_GRAD,border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer" }}><IC.Phone/> Send Message</button>
            <button style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#3b82f6",border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer" }}><IC.MapPin/> Directions</button>
          </div>
        </div>
      </div>
    </div>
  );
} 
interface ProductCardProps {
  product:    Product;
  onBook: (product: Product) => void;
}

function ProductCard({ product, onBook }: ProductCardProps) {
  const [fav,     setFav]     = useState(false);
  const [imgOk,   setImgOk]   = useState(Boolean(product.image?.trim()));

  useEffect(() => {
    setImgOk(Boolean(product.image?.trim()));
  }, [product.image]);

  const handleImgError = () => {
    setImgOk(false);
  }; 
  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBook(product);
  }; 

  return (
    <div
      style={{ background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f0f0f0",display:"flex",flexDirection:"column",cursor:"pointer",transition:"transform .2s,box-shadow .2s" }}
      onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow="0 8px 24px rgba(0,0,0,0.14)"; }}
      onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.transform="translateY(0)";   (e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 12px rgba(0,0,0,0.08)"; }}
    > 
      <div style={{ position:"relative",height:155,background:"#f3f4f6",flexShrink:0,overflow:"hidden" }}>
        {imgOk && product.image ? (
        <img
          src={product.image}
          alt={product.name}
          onError={handleImgError}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform .35s" }}
          onMouseEnter={e=>(e.currentTarget as HTMLImageElement).style.transform="scale(1.06)"}
          onMouseLeave={e=>(e.currentTarget as HTMLImageElement).style.transform="scale(1)"}
        />
        ) : (
        <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#9ca3af" }}>No image</div>
        )} 
        {product.badge && (
          <div style={{ position:"absolute",top:8,left:8,background:"rgba(255,255,255,0.93)",color:TEAL,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:12,border:`1.5px solid ${TEAL}`,backdropFilter:"blur(4px)",zIndex:2 }}>
            {product.badge}
          </div>
        )} 
        <button
          onClick={e=>{e.stopPropagation();setFav(f=>!f);}}
          style={{ position:"absolute",top:8,right:8,background:"#fff",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.14)",zIndex:2 }}
        >
          <IC.Heart filled={fav}/>
        </button>
      </div>
 
      <div style={{ padding:"10px 12px 12px",display:"flex",flexDirection:"column",flex:1 }}>
        <h3 style={{ fontSize:12,fontWeight:700,color:"#111827",margin:"0 0 3px",lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
          {product.name}
        </h3>
        <div style={{ fontSize:10,color:"#9ca3af",marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
          {product.brand}
        </div>
 
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
          <div>
            <span style={{ fontSize:13,fontWeight:800,color:"#111827" }}>₹{product.price}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span style={{ fontSize:10,color:"#9ca3af",textDecoration:"line-through",marginLeft:4 }}>₹{product.originalPrice}</span>
            )}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:3,background:"#fffbeb",padding:"2px 7px",borderRadius:20 }}>
            <IC.Star size={10}/>
            <span style={{ fontSize:10,fontWeight:700,color:"#d97706" }}>{product.rating}</span>
            <span style={{ fontSize:9,color:"#9ca3af" }}>({product.reviews})</span>
          </div>
        </div> 
        <div style={{ fontSize:10,color:"#6b7280",marginBottom:8,display:"flex",alignItems:"center",gap:4 }}>
          <IC.Clock/>
          <span>Starts at ₹{product.price} • {product.duration}</span>
        </div>
 
        <div style={{ borderTop:"1px solid #f0f0f0",paddingTop:8,display:"flex",gap:6,alignItems:"center" }}>
          <button
            onClick={handleBook}
            style={{
              flex: 1,
              height: 30,
              border: "1.5px solid #e0e0e0",
              borderRadius: 10,
              background: "#fff",
              color: "#374151",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .2s",
            }}
          >
            Book service
          </button>
        </div>
      </div>
    </div>
  );
}
 
function RatingSection({ vendor }:{ vendor:Vendor }) {
  return (
    <div style={{ background:"#f9fafb",borderRadius:14,padding:"18px 20px",marginTop:16 }}>
      <h4 style={{ fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 14px" }}>Ratings & Reviews</h4>
      <div style={{ display:"flex",gap:28,alignItems:"center" }}>
        <div style={{ textAlign:"center",flexShrink:0 }}>
          <div style={{ fontSize:52,fontWeight:900,color:"#111827",lineHeight:1 }}>{(Number.isFinite(vendor.rating) ? vendor.rating : 0).toFixed(1)}</div>
          <div style={{ display:"flex",justifyContent:"center",gap:2,margin:"6px 0 4px" }}>{[1,2,3,4,5].map(n=><IC.Star key={n} size={15} fill={n<=Math.floor(Number.isFinite(vendor.rating)?vendor.rating:0)?"#f59e0b":"#e5e7eb"}/>)}</div>
          <div style={{ fontSize:11,color:"#6b7280" }}>{vendor.totalRatings} {vendor.totalRatings === 1 ? "rating" : "ratings"}</div>
        </div>
        <p style={{ flex:1,fontSize:12,color:"#6b7280",margin:0,lineHeight:1.5 }}>
          Star breakdown appears here when the API provides distribution data.
        </p>
      </div>
    </div>
  );
}

function defaultBanners(vendorName: string, icon: string): BannerSlide[] {
  const title = vendorName.length > 32 ? `${vendorName.slice(0, 29)}…` : vendorName;
  return [
    {
      gradient: TEAL_DARK,
      accent: "#34d399",
      title: title.toUpperCase().replace(/\s+/g, "\n"),
      subtitle: "Products & services",
      handle: "",
      badgeText: "VENDOR",
      icon: icon.startsWith("http") ? "🏪" : icon,
    },
  ];
}

type ReviewSummaryShape = {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<number, number>;
};

const EMPTY_REVIEW_SUMMARY: ReviewSummaryShape = {
  averageRating: 0,
  totalReviews: 0,
  breakdown: {},
};

function mapCatalogServices(
  services: CatalogServiceItem[],
  offeredPriceByServiceId: Map<string, number>,
): Product[] {
  return services.map((s) => {
    const sid = String(s.id);
    const raw =
      offeredPriceByServiceId.get(sid) ??
      Number(s.basePrice ?? s.price ?? s.metadata?.price ?? 0);
    const unit = Number.isFinite(raw) ? Number(raw) : 0;
    return {
      id: s.id,
      name: s.name || "Service",
      brand: "",
      price: unit,
      originalPrice: unit,
      rating: 0,
      reviews: 0,
      image: pickServiceImage(s as any) || "",
      description: s.description ?? "",
      duration: String(s.duration || "—"),
      category: "Service",
    };
  });
}

function buildVendorState(
  v: CatalogVendor,
  catalogServices: CatalogServiceItem[],
  offeredPriceByServiceId: Map<string, number>,
  summary: ReviewSummaryShape,
): Vendor {
  const logoResolved = pickVendorImage(v as any)?.trim();
  const logoText = (v as any).logo?.trim();
  const logoDisplay = logoResolved || logoText || "🏪";
  const bannerIcon = logoResolved ? "🏪" : logoDisplay;
  return {
    id: String(v.id),
    name: (v as any).businessName || (v as any).name || "Vendor",
    logo: logoDisplay,
    logoColor: "#0d9488",
    verified: Boolean(v.isActive),
    since: "—",
    category: "General",
    subCategory: v.description ?? "",
    delivery: "—",
    rating: summary.averageRating || (v as any).rating || 0,
    totalRatings: summary.totalReviews,
    phone: "",
    email: "",
    address: "",
    description: v.description ?? "",
    openHours: "—",
    distance: "—",
    banners: defaultBanners(v.name ?? "Vendor", bannerIcon),
    tabs: ["Services", "About", "Gallery"],
    products: mapCatalogServices(catalogServices, offeredPriceByServiceId),
  };
}

function ProductGridSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ height: 280, borderRadius: 16, background: "#f3f4f6" }} />
      ))}
    </div>
  );
}

interface VendorDetailPageProps {
  vendorId: string;
  onBack:   () => void;
  /** Catalog service id when user arrived from the Services list */
  prefillServiceId?: string | null;
  prefillServiceTitle?: string;
  prefillPrice?: number;
  /** Open booking modal once after vendor loads (e.g. chose a service from list) */
  autoOpenBooking?: boolean;
}

export default function VendorDetailPage({
  vendorId,
  onBack,
  prefillServiceId = null,
  prefillServiceTitle,
  prefillPrice,
  autoOpenBooking = false,
}: VendorDetailPageProps) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    serviceId: string;
    title: string;
    price: number;
  } | null>(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const idParam = vendorId.trim();
    if (!idParam) {
      setVendor(null);
      setLoadingVendor(false);
      setLoadingProducts(false);
      return;
    }
    const numId = Number(idParam);
    const catalogId = Number.isFinite(numId) && String(numId) === idParam ? numId : idParam;

    setVendor(null);
    setLoadingVendor(true);
    setLoadingProducts(true);

    catalogApi
      .getVendor(catalogId)
      .then((v) => {
        if (cancelled) return;
        setVendor(buildVendorState(v, [], new Map<string, number>(), EMPTY_REVIEW_SUMMARY));
        setLoadingVendor(false);
        return Promise.all([
          catalogApi.getServices({ limit: 200 }),
          commerceApi.getReviewSummary("vendor", catalogId).catch(() => EMPTY_REVIEW_SUMMARY),
        ]).then(([servicesRes, summary]) => ({ v, servicesRes, summary }));
      })
      .then(async (pack) => {
        if (cancelled || !pack) return;
        const { v, servicesRes, summary } = pack;
        const allServices = servicesRes.data ?? [];
        const vendorIdStr = String(v.id);

        // Prefer direct mapping from service row; fallback to offer mapping.
        let vendorServices = allServices.filter((s) => {
          const direct = String(s.vendorId ?? "").trim();
          const meta = (s.metadata ?? {}) as Record<string, unknown>;
          const fromMeta = String(meta.vendorId ?? "").trim();
          return direct === vendorIdStr || fromMeta === vendorIdStr;
        });
        const offeredPriceByServiceId = new Map<string, number>();

        if (vendorServices.length === 0) {
          const matched = await Promise.all(
            allServices.map(async (service) => {
              try {
                const offers = await catalogApi.getServiceVendorOffers(String(service.id));
                const mine = offers.find((o) => String(o.vendor?.id ?? "") === vendorIdStr);
                if (!mine) return null;
                const offerPrice = Number(mine.price || 0);
                if (Number.isFinite(offerPrice) && offerPrice > 0) {
                  offeredPriceByServiceId.set(String(service.id), offerPrice);
                }
                return service;
              } catch {
                return null;
              }
            }),
          );
          vendorServices = matched.filter((x): x is CatalogServiceItem => Boolean(x));
        }

        setVendor(buildVendorState(v, vendorServices, offeredPriceByServiceId, summary));
      })
      .catch(() => {
        if (!cancelled) setVendor(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingVendor(false);
          setLoadingProducts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const [activeTab,        setActiveTab]        = useState(0);
  const [search,           setSearch]           = useState("");
  const [categoryChip,     setCategoryChip]     = useState("All Service");
  const [selectedBrands,   setSelectedBrands]   = useState<string[]>([]);
  const [ratingFilter,     setRatingFilter]     = useState<number|null>(null);
  const [offersOnly,       setOffersOnly]       = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); 
  const brands = useMemo(()=>
    Array.from(new Set((vendor?.products??[]).map(p=>p.brand))).sort()
  ,[vendor]);
 
  const chips = useMemo(() => {
    if (!vendor) return [];
    const parts = vendor.products
      .map((p) => p.category.trim().split(/\s+/)[0])
      .filter(Boolean);
    return ["All Service", ...Array.from(new Set(parts))];
  }, [vendor]);

  const filtered = useMemo(()=>{
    if (!vendor) return [];
    let d = [...vendor.products];
    if (search)              d = d.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
    if (categoryChip!=="All Service") d = d.filter(p=>p.category.startsWith(categoryChip));
    if (selectedBrands.length)  d = d.filter(p=>selectedBrands.includes(p.brand));
    if (ratingFilter!==null) d = d.filter(p=>p.rating>=ratingFilter);
    if (offersOnly)          d = d.filter(p=>Boolean(p.badge));
    return d;
  },[vendor,search,categoryChip,selectedBrands,ratingFilter,offersOnly]);

  const activeFilters: string[] = [
    ratingFilter!==null?`⭐ ${ratingFilter}+`:null,
    offersOnly?"Deals":null,
    ...selectedBrands,
  ].filter((f): f is string => f!==null);

  const removeFilter = (f:string)=>{
    if(f.startsWith("⭐")) setRatingFilter(null);
    else if(f==="Deals")   setOffersOnly(false);
    else setSelectedBrands(p=>p.filter(x=>x!==f));
  };

  const toggleBrand=(b:string)=>setSelectedBrands(p=>p.includes(b)?p.filter(x=>x!==b):[...p,b]);

  useEffect(() => {
    setActiveTab(0);
    setSearch("");
    setCategoryChip("All Service");
    setSelectedBrands([]);
    setRatingFilter(null);
    setOffersOnly(false);
    setFilterDrawerOpen(false);
  }, [vendorId]);

  useEffect(() => {
    autoOpenedRef.current = false;
  }, [vendorId]);

  useEffect(() => {
    if (!autoOpenBooking || !vendor) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    setBookingOpen(true);
  }, [autoOpenBooking, vendor]);

  const bookNowLabel =
    prefillPrice != null && Number.isFinite(prefillPrice) && prefillPrice > 0
      ? `Book now @ ₹${Math.round(prefillPrice)}`
      : "Book service";

  const handleQuickAddFromHeader = () => setBookingOpen(true);

  const handleBookService = (product: Product) => {
    setSelectedBooking({
      serviceId: String(product.id),
      title: product.name,
      price: Number.isFinite(product.price) ? product.price : 0,
    });
    setBookingOpen(true);
  };

  if (loadingVendor && !vendor) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              fontSize: 12,
              color: "#6b7280",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ← Back to Services
          </button>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading vendor…</span>
        </div>
        <div style={{ height: 200, borderRadius: 16, background: "#f3f4f6", marginBottom: 16 }} />
        <div style={{ height: 140, borderRadius: 16, background: "#f3f4f6", marginBottom: 16 }} />
        <ProductGridSkeleton />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>Vendor not found.</p>
        <button onClick={onBack} style={{ color: TEAL, background: "none", border: "none", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>← Back to Services</button>
      </div>
    );
  }
 
  const renderServices = ()=>(
    <div> 
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap" }}>
        <div style={{ display:"flex",gap:6,overflowX:"auto",flex:1,paddingBottom:2 }}>
          {chips.map(chip=>(
            <button key={chip} onClick={()=>setCategoryChip(chip)} style={{ padding:"5px 13px",borderRadius:20,fontSize:11,fontWeight:600,border:`1px solid ${categoryChip===chip?TEAL:"#e5e7eb"}`,background:categoryChip===chip?TEAL_GRAD:"#fff",color:categoryChip===chip?"#fff":"#6b7280",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .15s" }}>{chip}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",background:"#fff" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ fontSize:11,padding:"6px 10px",border:"none",outline:"none",width:130,background:"transparent" }}/>
          <button style={{ padding:"6px 10px",background:TEAL_GRAD,border:"none",cursor:"pointer",display:"flex",alignItems:"center" }}><IC.Search/></button>
        </div>
        <button onClick={()=>setFilterDrawerOpen(true)} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",fontSize:11,fontWeight:600,color:"#374151",cursor:"pointer" }}>
          <IC.Filter/> Filter {activeFilters.length>0&&<span style={{ background:TEAL_GRAD,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700 }}>{activeFilters.length}</span>}
        </button>
      </div>
 
      {activeFilters.length>0&&(
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
          {activeFilters.map(f=>(
            <span key={f} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:TEAL_GRAD,fontSize:11,fontWeight:600,color:"#fff" }}>
              {f}<button onClick={()=>removeFilter(f)} style={{ background:"none",border:"none",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",padding:0 }}><IC.X size={8}/></button>
            </span>
          ))}
          <button onClick={()=>{setSelectedBrands([]);setRatingFilter(null);setOffersOnly(false);}} style={{ fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>Clear all</button>
        </div>
      )} 
      {loadingProducts ? (
        <div>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Loading bookable items…</p>
          <ProductGridSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:"60px 20px",textAlign:"center",color:"#9ca3af",fontSize:14 }}>No services found. Try adjusting your filters.</div>
      ) : (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14 }}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onBook={handleBookService}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderAbout = ()=>(
    <div>
      <h4 style={{ fontSize:15,fontWeight:700,color:"#111827",margin:"0 0 12px" }}>About {vendor.name}</h4>
      <p style={{ fontSize:13,color:"#6b7280",lineHeight:1.7,marginBottom:16 }}>{vendor.description}</p>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10 }}>
        {[
          { label:"Category",     value:vendor.category },
          { label:"Sub Category", value:vendor.subCategory },
          { label:"Since",        value:vendor.since },
          { label:"Delivery",     value:vendor.delivery },
          { label:"Rating",       value:`${vendor.rating}/5 (${vendor.totalRatings} reviews)` },
          { label:"Hours",        value:vendor.openHours },
        ].map(item=>(
          <div key={item.label} style={{ background:"#f9fafb",borderRadius:10,padding:"12px 14px" }}>
            <div style={{ fontSize:10,color:"#9ca3af",marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{item.value}</div>
          </div>
        ))}
      </div>
      <RatingSection vendor={vendor}/>
    </div>
  );

  const renderGallery = ()=>(
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
      {vendor.products.length === 0 ? (
        <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No gallery images yet.</p>
      ) : (
      vendor.products.slice(0,9).map((p,i)=>(
        <div key={i} style={{ borderRadius:12,overflow:"hidden",aspectRatio:"1",background:"#e5e7eb" }}>
          {p.image ? (
            <img src={p.image} alt={p.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          ) : (
            <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#9ca3af" }}>No image</div>
          )}
        </div>
      )))}
    </div>
  );

  const tabIcons = [<IC.Tag key="tag" />, <IC.Info key="info" />, <IC.Gallery key="gallery" />];

  return (
    <div >
      <div style={{ maxWidth:1200,margin:"0 auto",padding:"16px" }}> 
        <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#9ca3af",marginBottom:16 }}>
          <span style={{ cursor:"pointer",transition:"color .15s" }} onClick={onBack} onMouseEnter={e=>(e.currentTarget as HTMLSpanElement).style.color="#374151"} onMouseLeave={e=>(e.currentTarget as HTMLSpanElement).style.color="#9ca3af"}>Shop</span>
          <span style={{ color:"#d1d5db" }}>›</span>
          <span style={{ cursor:"pointer" }} onClick={onBack}>{vendor.category}</span>
          <span style={{ color:"#d1d5db" }}>›</span>
          <span style={{ color:"#374151",fontWeight:600 }}>{vendor.name}</span>
        </div> 
        <BannerCarousel banners={vendor.banners} vendorName={vendor.name}/>
 
        <VendorInfoCard
          vendor={vendor}
          onBookNow={handleQuickAddFromHeader}
          bookNowLabel={bookNowLabel}
        /> 
        <div style={{ background:"#fff",borderRadius:16,padding:"16px 20px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"1px solid #f0f0f0" }}>
          {/* Tab bar */}
          <div style={{ display:"flex",gap:0,borderBottom:"2px solid #f0f0f0",marginBottom:18 }}>
            {vendor.tabs.map((tab,i)=>(
              <button key={tab} onClick={()=>setActiveTab(i)} style={{ padding:"10px 24px",fontSize:13,fontWeight:activeTab===i?700:500,color:activeTab===i?TEAL:"#6b7280",border:"none",background:"transparent",cursor:"pointer",borderBottom:activeTab===i?`2px solid ${TEAL}`:"2px solid transparent",marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:6 }}>
                {tabIcons[i]}{tab}
              </button>
            ))}
          </div> 
          {activeTab===0&&<h3 style={{ fontSize:14,fontWeight:700,color:"#111827",margin:"0 0 14px" }}>Service List</h3>}

          {activeTab===0&&renderServices()}
          {activeTab===1&&renderAbout()}
          {activeTab===2&&renderGallery()}
        </div>
      </div> 
      <ServiceBookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vendorId={vendor.id}
        catalogServiceId={selectedBooking?.serviceId ?? prefillServiceId}
        serviceTitle={selectedBooking?.title ?? prefillServiceTitle}
        priceHint={selectedBooking?.price ?? prefillPrice}
      />
      {filterDrawerOpen&&(
        <div style={{ position:"fixed",inset:0,zIndex:400 }}>
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.45)" }} onClick={()=>setFilterDrawerOpen(false)}/>
          <div style={{ position:"absolute",right:0,top:0,bottom:0,width:280,background:"#fff",padding:20,overflowY:"auto",zIndex:1,boxShadow:"-4px 0 24px rgba(0,0,0,0.15)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <span style={{ fontWeight:700,fontSize:15,color:"#111827" }}>Filters</span>
              <button onClick={()=>setFilterDrawerOpen(false)} style={{ background:"none",border:"none",cursor:"pointer" }}><IC.X size={18}/></button>
            </div> 
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11,fontWeight:800,color:"#374151",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Brands</div>
              {brands.map(b=>(
                <div key={b} onClick={()=>toggleBrand(b)} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 0",cursor:"pointer" }}>
                  <Checkbox checked={selectedBrands.includes(b)} onChange={()=>toggleBrand(b)}/>
                  <span style={{ fontSize:12,color:selectedBrands.includes(b)?TEAL:"#4b5563",fontWeight:selectedBrands.includes(b)?600:400 }}>{b}</span>
                </div>
              ))}
            </div> 
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11,fontWeight:800,color:"#374151",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Rating</div>
              {[4.5,4.0,3.5].map(r=>(
                <div key={r} onClick={()=>setRatingFilter(ratingFilter===r?null:r)} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 0",cursor:"pointer" }}>
                  <Checkbox checked={ratingFilter===r} onChange={()=>setRatingFilter(ratingFilter===r?null:r)} accent="#f59e0b"/>
                  <span style={{ fontSize:12,display:"flex",alignItems:"center",gap:3,color:"#4b5563" }}>
                    {[1,2,3,4].map(n=><IC.Star key={n} size={11} fill={n<=Math.floor(r)?"#f59e0b":"#e5e7eb"}/>)} {r}+
                  </span>
                </div>
              ))}
            </div>
 
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11,fontWeight:800,color:"#374151",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Offers</div>
              <div onClick={()=>setOffersOnly(o=>!o)} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
                <Checkbox checked={offersOnly} onChange={()=>setOffersOnly(o=>!o)}/>
                <span style={{ fontSize:12,color:"#4b5563" }}>Show deals only</span>
              </div>
            </div>

            <button onClick={()=>setFilterDrawerOpen(false)} style={{ width:"100%",padding:"11px",background:TEAL_GRAD,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Apply Filters</button>
          </div>
        </div>
      )}
    </div>
  );
}