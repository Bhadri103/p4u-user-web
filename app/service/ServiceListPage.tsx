"use client";
import { useState, useEffect, useMemo, ReactNode } from "react";
import {
  TEAL, TEAL_GRAD, TEAL_DARK,
  RATING_OPTS, REVIEW_OPTS, OFFER_OPTS, SORT_OPTS, PER_PAGE,
  Seller,
} from "./serviceData";
import { catalogApi, type Category } from "@/lib/api/catalog";
import { pickServiceImage } from "@/lib/media";
import { addServiceWishlist, getServiceWishlist, removeServiceWishlist } from "@/lib/serviceWishlist";

const IC = {
  Star:      ({ fill="#f59e0b",size=13 }:{ fill?:string;size?:number })=><svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  MapPin:    ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Clock:     ()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Search:    ()=><svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ChevDown:  ({ open }:{ open:boolean })=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>,
  ChevLeft:  ()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight: ()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  X:         ({ size=10 }:{ size?:number })=><svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Filter:    ()=><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Heart:     ({ filled }:{ filled:boolean })=><svg width="14" height="14" fill={filled?"#ef4444":"none"} stroke={filled?"#ef4444":"#9ca3af"} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
};
 
function Checkbox({ checked, onChange, accent=TEAL }:{ checked:boolean;onChange:()=>void;accent?:string }) {
  return (
    <div onClick={onChange} style={{ width:15,height:15,borderRadius:3,border:`2px solid ${checked?accent:"#d1d5db"}`,background:checked?accent:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"all .15s" }}>
      {checked&&<svg width="8" height="8" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
} 
function Accordion({ label, isOpen, toggle, children }:{ label:string;isOpen:boolean;toggle:()=>void;children:ReactNode }) {
  return (
    <div style={{ borderTop:"1px solid #f0f0f0" }}>
      <button onClick={toggle} style={{ width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:"transparent",border:"none",cursor:"pointer" }}>
        <span style={{ fontSize:12,fontWeight:700,color:"#374151",letterSpacing:"0.05em",textTransform:"uppercase" }}>{label}</span>
        <IC.ChevDown open={isOpen}/>
      </button>
      {isOpen&&<div style={{ padding:"2px 14px 12px",display:"flex",flexDirection:"column",gap:9 }}>{children}</div>}
    </div>
  );
}
 
interface SidebarProps {
  ratingFilter:number[]; toggleRating:(v:number)=>void;
  reviewFilter:string[]; toggleReview:(v:string)=>void;
  offerFilter:string[];  toggleOffer:(v:string)=>void;
}

function Sidebar({ ratingFilter,toggleRating,reviewFilter,toggleReview,offerFilter,toggleOffer }:SidebarProps) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);

  return (
    <div style={{ width:200,flexShrink:0,display:"flex",flexDirection:"column",gap:12 }}> 
      <div style={{ background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }}>
        <div style={{ padding:"12px 14px",background:TEAL_GRAD }}>
          <span style={{ fontSize:12,fontWeight:700,color:"#fff",letterSpacing:"0.06em",textTransform:"uppercase" }}>Services</span>
          <p style={{ fontSize:10,color:"rgba(255,255,255,0.9)",margin:"6px 0 0",lineHeight:1.4,fontWeight:400 }}>Pick a service category above the list (flat taxonomy—no subcategories). Catalog services only, not shop products.</p>
        </div>
        <Accordion label="Rating" isOpen={ratingOpen} toggle={()=>setRatingOpen(o=>!o)}>
          {RATING_OPTS.map(opt=>(
            <div key={opt.label} onClick={()=>toggleRating(opt.min)} style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer" }}>
              <Checkbox checked={ratingFilter.includes(opt.min)} onChange={()=>toggleRating(opt.min)} accent="#f59e0b"/>
              <span style={{ fontSize:12,display:"flex",alignItems:"center",gap:3,color:ratingFilter.includes(opt.min)?"#b45309":"#4b5563" }}>
                {[1,2,3,4].map(n=><IC.Star key={n} size={11} fill={n<=Math.floor(opt.min)?"#f59e0b":"#e5e7eb"}/>)}
                <span style={{ marginLeft:2 }}>{opt.label}</span>
              </span>
            </div>
          ))}
        </Accordion>
        <Accordion label="Review" isOpen={reviewOpen} toggle={()=>setReviewOpen(o=>!o)}>
          {REVIEW_OPTS.map(opt=>(
            <div key={opt} onClick={()=>toggleReview(opt)} style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer" }}>
              <Checkbox checked={reviewFilter.includes(opt)} onChange={()=>toggleReview(opt)}/>
              <span style={{ fontSize:12,color:reviewFilter.includes(opt)?TEAL:"#4b5563",fontWeight:reviewFilter.includes(opt)?600:400 }}>{opt}</span>
            </div>
          ))}
        </Accordion>
        <Accordion label="Offers" isOpen={offersOpen} toggle={()=>setOffersOpen(o=>!o)}>
          {OFFER_OPTS.map(opt=>(
            <div key={opt} onClick={()=>toggleOffer(opt)} style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer" }}>
              <Checkbox checked={offerFilter.includes(opt)} onChange={()=>toggleOffer(opt)} accent="#7c3aed"/>
              <span style={{ fontSize:12,color:offerFilter.includes(opt)?"#7c3aed":"#4b5563",fontWeight:offerFilter.includes(opt)?600:400 }}>{opt}</span>
            </div>
          ))}
        </Accordion>
      </div> 
      <div style={{ borderRadius:16,overflow:"hidden",position:"relative",background:"linear-gradient(155deg,#7c3aed 0%,#6d28d9 45%,#4c1d95 100%)",padding:"22px 18px 20px",color:"#fff",boxShadow:"0 8px 32px rgba(109,40,217,0.4)" }}>
        <div style={{ position:"absolute",top:-24,right:-24,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,0.07)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-14,left:-18,width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.05)",pointerEvents:"none" }}/>
        <p style={{ fontSize:15,fontWeight:900,color:"#fff",margin:"0 0 6px",lineHeight:1.2,position:"relative" }}>Welcome to ClassiGrids</p>
        <p style={{ fontSize:10,color:"rgba(255,255,255,0.8)",margin:"0 0 12px",lineHeight:1.55,position:"relative" }}>Buy And Sell Everything From Used Cars To Mobile Phones and Computers, Or Jobs And More.</p>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:50,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:"-1px" }}>50%</div>
          <div style={{ fontSize:24,fontWeight:900,color:"#fff",lineHeight:1,marginBottom:14 }}>OFF</div>
        </div>
        <button style={{ padding:"9px 0",width:"100%",background:"rgba(255,255,255,0.18)",border:"2px solid rgba(255,255,255,0.5)",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Buy Now!</button>
      </div>
    </div>
  );
}
 
function ServiceCard({
  service,
  fav,
  onToggleFav,
  onClick,
  busy,
  onPrefetch,
}: {
  service: Seller;
  fav: boolean;
  onToggleFav: (service: Seller) => void;
  onClick: () => void;
  busy?: boolean;
  onPrefetch?: () => void;
}) {
  const [imgOk,   setImgOk]   = useState(Boolean(service.image?.trim()));

  const handleError = () => {
    setImgOk(false);
  };

  return (
    <div
      style={{
        background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.09)",
        cursor: busy ? "wait" : "pointer",transition:"transform .22s,box-shadow .22s,opacity .2s",display:"flex",flexDirection:"column",
        opacity: busy ? 0.72 : 1,
        pointerEvents: busy ? "none" : "auto",
      }}
      onMouseEnter={e=>{
        if (busy) return;
        (e.currentTarget as HTMLDivElement).style.transform="scale(1.02)";
        (e.currentTarget as HTMLDivElement).style.boxShadow="0 10px 30px rgba(0,0,0,0.15)";
        onPrefetch?.();
      }}
      onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.transform="scale(1)";   (e.currentTarget as HTMLDivElement).style.boxShadow="0 2px 12px rgba(0,0,0,0.09)"; }}
      onClick={busy ? undefined : onClick}
    >
      <div style={{ position:"relative",height:200,background:"#e5e7eb",flexShrink:0,overflow:"hidden" }}>
        {imgOk && service.image ? (
        <img
          src={service.image}
          alt={service.title}
          onError={handleError}
          style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",transition:"transform .4s" }}
          onMouseEnter={e=>(e.currentTarget as HTMLImageElement).style.transform="scale(1.05)"}
          onMouseLeave={e=>(e.currentTarget as HTMLImageElement).style.transform="scale(1)"}
        />
        ) : (
        <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#9ca3af" }}>No image</div>
        )}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.28) 0%,transparent 55%)",pointerEvents:"none" }}/>
        {service.badge&&<div style={{ position:"absolute",top:10,left:10,background:service.badge.bg,color:"#fff",fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:20,border:"2px solid rgba(255,255,255,0.65)",backdropFilter:"blur(4px)",zIndex:2 }}>{service.badge.label}</div>}
        <div style={{ position:"absolute",bottom:10,left:10,background:"rgba(255,255,255,0.93)",backdropFilter:"blur(4px)",borderRadius:20,padding:"3px 9px",display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#374151",zIndex:2 }}><IC.MapPin/>{service.distance}</div>
        <button
          onClick={e=>{ e.stopPropagation(); onToggleFav(service); }}
          style={{ position:"absolute",top:10,right:10,background:"#fff",border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.14)",zIndex:2 }}
        ><IC.Heart filled={fav}/></button>
      </div>
      <div style={{ padding:"12px 14px 14px",display:"flex",flexDirection:"column",flex:1 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5 }}>
          <h3 style={{ fontSize:13,fontWeight:700,color:"#111827",margin:0,flex:1,lineHeight:1.3 }}>{service.title}</h3>
          <div style={{ display:"flex",alignItems:"center",gap:3,marginLeft:8,flexShrink:0 }}><IC.Star/><span style={{ fontSize:12,fontWeight:700,color:"#111827" }}>{service.rating}</span></div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:5,color:"#6b7280",fontSize:12,marginBottom:4 }}><IC.MapPin/><span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{service.provider}</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:5,color:"#6b7280",fontSize:12,marginBottom:8 }}><IC.Clock/><span>{service.duration}</span></div>
        <p style={{ fontSize:12,color:"#6b7280",margin:"0 0 12px",lineHeight:1.45,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{service.description}</p>
        <button
          style={{ width:"100%",padding:"9px 0",color:"#fff",fontSize:12,fontWeight:600,border:"none",borderRadius:10,cursor:"pointer",background:TEAL_DARK,marginTop:"auto" }}
          onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.opacity="0.85"}
          onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.opacity="1"}
        >
          Book service
        </button>
      </div>
    </div>
  );
} 
interface ServiceListPageProps {
  onSelectSeller: (seller: Seller) => void | Promise<void>;
  busyServiceId?: string | null;
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: T[] }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
}

export default function ServiceListPage({ onSelectSeller, busyServiceId }: ServiceListPageProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [ratingFilter,     setRatingFilter]     = useState<number[]>([]);
  const [reviewFilter,     setReviewFilter]     = useState<string[]>([]);
  const [offerFilter,      setOfferFilter]      = useState<string[]>([]);
  const [sortBy,           setSortBy]           = useState("popularity");
  const [search,           setSearch]           = useState("");
  const [page,             setPage]             = useState(1);
  const [activeTopFilters, setActiveTopFilters] = useState<string[]>(["Popularity","Rating","Offers","Delivery Time"]);
  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [serviceWishlistIds, setServiceWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const rows = getServiceWishlist();
    setServiceWishlistIds(new Set(rows.map((row) => String(row.id))));
  }, []);

  useEffect(() => {
    catalogApi.getCategories({ limit: 200, kind: "service" }).then((res) => {
      const list = unwrapList<Category>(res);
      setRootCategories(list.filter((c) => !c.parentId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params: {
      limit: number;
      offset: number;
      categoryId?: string;
    } = { limit: 200, offset: 0 };
    if (parentCategoryId.trim()) params.categoryId = parentCategoryId.trim();

    catalogApi.getServices(params).then((res) => {
      const rows = res.data ?? [];
      setSellers(rows.map((s): Seller => {
        const meta = (s as { metadata?: Record<string, unknown> }).metadata;
        const vendorFromMeta =
          meta && typeof meta.vendorId === "string" ? meta.vendorId : "";
        const price = Number((s as any).basePrice ?? (s as any).price ?? (meta && typeof meta.price !== "undefined" ? Number(meta.price) : 0) ?? 0);
        return {
        id: typeof s.id === "number" ? s.id : String(s.id),
        title: s.name,
        image: pickServiceImage(s as unknown as Parameters<typeof pickServiceImage>[0]) ?? "",
        provider: s.description ?? s.name,
        description: s.description ?? "",
        rating: 0,
        price: Number.isFinite(price) ? price : 0,
        duration: String((meta && typeof meta.duration === "string" ? meta.duration : "") ?? ""),
        distance: "",
        category: "",
        badge: null,
        hasOffer: false,
        vendorId: String((s as { vendorId?: string }).vendorId ?? vendorFromMeta ?? ""),
      };
      }));
    }).catch(() => setSellers([]));
  }, [parentCategoryId]);

  const mkToggleStr = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (val: string) => {
    setter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
    setPage(1);
  };
  const mkToggleNum = (setter: React.Dispatch<React.SetStateAction<number[]>>) => (val: number) => {
    setter(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
    setPage(1);
  };
  const toggleRating = mkToggleNum(setRatingFilter);
  const toggleReview = mkToggleStr(setReviewFilter);
  const toggleOffer  = mkToggleStr(setOfferFilter);

  const filtered = useMemo(() => {
    let d = [...sellers];
    if (search)                d = d.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
    if (ratingFilter.length)  d = d.filter(s => ratingFilter.some(m => s.rating >= m));
    if (offerFilter.length)   d = d.filter(s => s.hasOffer);
    if (sortBy === "low")        d.sort((a,b) => a.price - b.price);
    else if (sortBy === "high")  d.sort((a,b) => b.price - a.price);
    else if (sortBy === "newest") d.sort((a,b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    else d.sort((a,b) => b.rating - a.rating);
    return d;
  }, [sellers, search, ratingFilter, offerFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const sidebarActive = [...ratingFilter.map(r=>`⭐ ${r}+`), ...reviewFilter, ...offerFilter.map(o=>`🏷 ${o}`)];
  const clearAll = () => { setActiveTopFilters([]); setRatingFilter([]); setReviewFilter([]); setOfferFilter([]); setPage(1); };
  const toggleServiceWishlist = (service: Seller) => {
    const key = String(service.id);
    const exists = serviceWishlistIds.has(key);
    let rows = getServiceWishlist();
    if (exists) {
      rows = removeServiceWishlist(key);
    } else {
      rows = addServiceWishlist({
        id: key,
        title: service.title,
        image: service.image,
        provider: service.provider,
        price: service.price,
        duration: service.duration,
        vendorId: service.vendorId,
      });
    }
    setServiceWishlistIds(new Set(rows.map((row) => String(row.id))));
  };
  const getPages = (): (number | "...")[] => {
    const ps: (number | "...")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page-1 && i <= page+1)) ps.push(i);
      else if (ps[ps.length-1] !== "...") ps.push("...");
    }
    return ps;
  };

  const sidebarProps: SidebarProps = { ratingFilter, toggleRating, reviewFilter, toggleReview, offerFilter, toggleOffer };

  return (
    <div   >
    

      <div style={{ maxWidth:1300,margin:"0 auto",padding:"16px",display:"flex",gap:18,alignItems:"flex-start" }}> 
        <aside className="svc-sidebar" style={{ position:"sticky",top:12 }}>
          <Sidebar {...sidebarProps}/>
        </aside> 
        {drawerOpen&&(
          <div style={{ position:"fixed",inset:0,zIndex:300 }}>
            <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.45)" }} onClick={()=>setDrawerOpen(false)}/>
            <div style={{ position:"absolute",left:0,top:0,bottom:0,width:240,background:"#f5f5f5",overflowY:"auto",padding:14,zIndex:1 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <span style={{ fontWeight:700 }}>Filters</span>
                <button onClick={()=>setDrawerOpen(false)} style={{ background:"none",border:"none",cursor:"pointer" }}><IC.X size={18}/></button>
              </div>
              <Sidebar {...sidebarProps}/>
            </div>
          </div>
        )} 
        <div style={{ flex:1,minWidth:0 }}> 
          <div style={{ background:"#fff",borderRadius:12,padding:"12px 16px",marginBottom:10,boxShadow:"0 1px 5px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div style={{ display:"flex",flexDirection:"column",gap:8,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                  <span style={{ fontSize:14,fontWeight:700,color:"#111827" }}>Services</span>
                  <span style={{ fontSize:12,color:"#9ca3af" }}>Showing 1–{filtered.length} of {sellers.length}</span>
                </div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8,alignItems:"center" }}>
                  <select
                    value={parentCategoryId}
                    onChange={(e) => { setParentCategoryId(e.target.value); setPage(1); }}
                    style={{ fontSize:12,padding:"6px 10px",borderRadius:8,border:"1px solid #e5e7eb",maxWidth:200 }}
                  >
                    <option value="">All categories</option>
                    {rootCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={()=>setDrawerOpen(true)} className="svc-mobile-filter" style={{ display:"none",alignItems:"center",gap:5,padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",fontSize:12,cursor:"pointer" }}>
                <IC.Filter/> Filters
              </button>
            </div> 
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,alignItems:"center" }}>
              {activeTopFilters.map(f=>(
                <span key={f} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:"1px solid #e5e7eb",fontSize:12,fontWeight:500,color:"#374151",background:"#fafafa" }}>
                  {f}<button onClick={()=>setActiveTopFilters(p=>p.filter(x=>x!==f))} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:"#9ca3af",padding:0 }}><IC.X/></button>
                </span>
              ))}
              {sidebarActive.map(f=><span key={f} style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:TEAL_GRAD,fontSize:11,fontWeight:600,color:"#fff" }}>{f}</span>)}
              {(activeTopFilters.length>0||sidebarActive.length>0)&&<button onClick={clearAll} style={{ fontSize:12,color:TEAL,fontWeight:600,background:"none",border:"none",cursor:"pointer" }}>Clear all filter</button>}
            </div>
          </div>
 
          <div style={{ background:"#fff",borderRadius:12,padding:"10px 16px",marginBottom:14,boxShadow:"0 1px 5px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:12,fontWeight:700,color:"#374151",marginRight:6 }}>Sort By</span>
            {SORT_OPTS.map(s=>(
              <button key={s.val} onClick={()=>{ setSortBy(s.val);setPage(1); }} style={{ fontSize:12,padding:"5px 14px",borderRadius:20,border:sortBy===s.val?"none":"1px solid #e5e7eb",background:sortBy===s.val?TEAL_GRAD:"#f9fafb",color:sortBy===s.val?"#fff":"#6b7280",fontWeight:sortBy===s.val?700:400,cursor:"pointer" }}>{s.label}</button>
            ))}
          </div>

          {/* Title + Search */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <h2 style={{ fontSize:18,color:"#111827",margin:0 }}>Near By Services</h2>
            <div style={{ display:"flex",alignItems:"center",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search Services..." style={{ fontSize:12,padding:"7px 12px",border:"none",outline:"none",width:180,background:"transparent",color:"#374151" }}/>
              <button style={{ padding:"7px 12px",background:TEAL_GRAD,border:"none",cursor:"pointer",display:"flex",alignItems:"center" }}><IC.Search/></button>
            </div>
          </div> 
          {paginated.length===0?(
            <div style={{ background:"#fff",borderRadius:16,padding:"80px 20px",textAlign:"center",color:"#9ca3af",fontSize:14 }}>No services found. Try adjusting your filters.</div>
          ):(
            <div className="svc-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
              {paginated.map((s) => (
                <ServiceCard
                  key={String(s.id)}
                  service={s}
                  fav={serviceWishlistIds.has(String(s.id))}
                  onToggleFav={toggleServiceWishlist}
                  busy={busyServiceId != null && String(busyServiceId) === String(s.id)}
                  onPrefetch={() => void catalogApi.prefetchServiceVendorOffers(String(s.id))}
                  onClick={() => void onSelectSeller(s)}
                />
              ))}
            </div>
          )} 
          {totalPages>1&&(
            <div style={{ display:"flex",justifyContent:"center",gap:6,margin:"24px 0 8px" }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ width:34,height:34,borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:page===1?"not-allowed":"pointer",opacity:page===1?0.4:1,display:"flex",alignItems:"center",justifyContent:"center" }}><IC.ChevLeft/></button>
              {getPages().map((p,idx)=>p==="..."
                ?<span key={`d${idx}`} style={{ width:34,textAlign:"center",lineHeight:"34px",color:"#9ca3af" }}>…</span>
                :<button key={p} onClick={()=>setPage(p as number)} style={{ width:34,height:34,borderRadius:8,fontSize:12,fontWeight:600,border:page===p?"none":"1px solid #e5e7eb",background:page===p?TEAL_GRAD:"#fff",color:page===p?"#fff":"#374151",cursor:"pointer" }}>{p}</button>)}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:34,height:34,borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:page===totalPages?"not-allowed":"pointer",opacity:page===totalPages?0.4:1,display:"flex",alignItems:"center",justifyContent:"center" }}><IC.ChevRight/></button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .svc-sidebar{display:block}
        @media(max-width:900px){.svc-sidebar{display:none!important}.svc-mobile-filter{display:flex!important}.svc-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:560px){.svc-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}