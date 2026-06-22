import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { contentApi } from "@/lib/api/content";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const AMBER = "#f59e0b";
const PURPLE = "#6d28d9";
const RED = "#ef4444";
const BLUE = "#3b82f6";

const ADS_PER_PAGE = 12;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = {
  Filter:   () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  Search:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  MapPin:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  Minus:    () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Plus:     () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Home:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  Info:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  Folder:   () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>,
  Calendar: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Close:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Heart:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
  Message:  () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  ChevronL: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>,
  ChevronR: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>,
  Menu:     () => <svg width="24" height="24" fill="none" stroke="#0d9488" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
};

// ─── STYLES (inline, scoped) ──────────────────────────────────────────────────
const s = {
  // Layout
  page:       { fontFamily: "'Barlow', system-ui, sans-serif",   minHeight: "100vh" },
  main:       { maxWidth: 1200, margin: "0 auto", padding: "28px 20px", display: "flex", gap: 28, alignItems: "flex-center" },

  // Nav
  nav:        { background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 60, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
  navLogo:    { fontFamily: "system-ui, sans-serif", fontSize: 24, fontWeight: 900, color: TEAL, letterSpacing: -0.5, whiteSpace: "nowrap" },
  navLinks:   { display: "flex", gap: 4, alignItems: "center" },
  navLink:    { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 4, fontSize: 14, fontWeight: 600, color: "#64748b", cursor: "pointer", border: "none", background: "none", transition: "color .2s, background .2s" },
  navBtn:     { background: TEAL, color: "#fff", border: "none", padding: "10px 20px", fontSize: 14, fontWeight: 700, borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 10 },

  // Hero
  hero:       {  padding: "50px 20px", textAlign: "center", borderBottom: "1px solid #e2e8f0" },
  heroBadge:  { background: AMBER, color: "#fff", display: "inline-block", padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 20, borderRadius: 2 },
  heroTitle:  { fontWeight: 900, color: "#111827", marginBottom: 32, lineHeight: 1.15 },

  // Search
  searchWrap: { display: "flex", maxWidth: 800, margin: "0 auto", background: "#fff", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" },
  searchField:{ flex: "1 1 50%", display: "flex", alignItems: "center", padding: "0 16px", minHeight: 56 },
  searchInput:{ flex: 1, border: "none", outline: "none", padding: "14px 10px", fontSize: 15, color: "#374151", width: "100%" },
  searchBtn:  { background: TEAL, color: "#fff", border: "none", padding: "0 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", minHeight: 56 },

  // Sidebar
  sidebar:    { flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 },
  sideCard:   { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 6, overflow: "hidden" },
  sideHeader: { background: TEAL, color: "#fff", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sideTitle:  { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" },
  catItem:    { display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", fontSize: 14, color: "#4b5563", cursor: "pointer", borderBottom: "1px solid #f9fafb", transition: "background .15s, color .15s", userSelect: "none" },
  catDot:     { width: 6, height: 6, background: TEAL, borderRadius: "50%", flexShrink: 0 },

  // Promo
  promo:      { background: "linear-gradient(155deg,#7c3aed 0%,#6d28d9 45%,#4c1d95 100%)", padding: "32px 24px", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden", borderRadius: 6 },
  promoBtn:   { width: "100%", padding: "12px 0", background: "#fff", border: "none", borderRadius: 4, color: PURPLE, fontSize: 14, fontWeight: 700, cursor: "pointer", position: "relative", zIndex: 1 },

  // Ad Grid
  adContent:  { flex: 1, minWidth: 0 },
  adHeader:   { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #e5e7eb", paddingBottom: 14, marginBottom: 24, flexWrap: "wrap", gap: 8 },
  adGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
  adCard:     { border: `1px solid ${BLUE}`, background: "#fff", display: "flex", flexDirection: "column", cursor: "pointer", borderRadius: 4, overflow: "hidden", transition: "transform .2s, box-shadow .2s" },
  adImg:      { height: 160, background: "radial-gradient(circle at 50% 40%,#fff 0%,#f3f4f6 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  wantedStamp:{ color: RED, border: `4px solid ${RED}`, padding: "6px 16px", fontSize: 28, fontWeight: 900, transform: "rotate(-12deg)", letterSpacing: 4, opacity: .88, borderRadius: 4, position: "relative", zIndex: 1, userSelect: "none" },
  adLabel:    { background: TEAL, color: "#fff", padding: "12px 10px", textAlign: "center", fontSize: 14, fontWeight: 700, marginTop: "auto" },

  // Pagination
  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 32, flexWrap: "wrap" },
  pgBtn:      { width: 38, height: 38, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" },

  // Modal
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:   { background: "#fff", borderRadius: 8, padding: 32, maxWidth: 460, width: "100%", position: "relative" },

  // Toast
  toast:      { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: "#fff", padding: "12px 24px", borderRadius: 6, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.25)", whiteSpace: "nowrap", transition: "opacity .3s, transform .3s", pointerEvents: "none" },
};

// ─── TOAST HOOK ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: "", visible: false });
  const timerRef = useRef(null);
  const show = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setToast({ msg, visible: true });
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  }, []);
  return [toast, show];
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function NavBar({ onPostAd }) {
  const links = [
    { label: "Help", Icon: Icon.Home },
    { label: "Services", Icon: Icon.Info },
    { label: "Goods", Icon: Icon.Folder },
    { label: "Booking", Icon: Icon.Calendar },
  ];

  return (
    <nav style={s.nav}>
      <span style={s.navLogo}>ClassiGrids</span>

      {/* Desktop links */}
      <div className="desktop-nav" style={s.navLinks}>
        {links.map(({ label, Icon: I }) => (
          <button key={label} style={s.navLink}
            onMouseEnter={e => { e.currentTarget.style.color = TEAL; e.currentTarget.style.background = "#f0fdfb"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "none"; }}
          >
            <I /> {label}
          </button>
        ))}
        <button style={s.navBtn}
          onClick={onPostAd}
          onMouseEnter={e => e.currentTarget.style.background = TEAL_DARK}
          onMouseLeave={e => e.currentTarget.style.background = TEAL}
        >+ Give an Ad</button>
      </div>

      {/* Mobile Menu Icon */}
      <button className="mobile-menu-btn" style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        <Icon.Menu />
      </button>
    </nav>
  );
}

function HeroSearch({ onSearch, categories = [] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div style={s.hero}>
      <div style={s.heroBadge}>FREE ADS PLAN</div>
      <h1 className="hero-title" style={s.heroTitle}>
        The Largest Classified Ads<br />Listing in the World.
      </h1>
      <div className="search-wrap" style={s.searchWrap}>
        <div className="search-field" style={{...s.searchField, borderRight: "1px solid #e5e7eb"}}>
          <Icon.Search />
          <input
            style={s.searchInput}
            placeholder="What are you looking for..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch(query, category)}
          />
        </div>
        <div className="search-field" style={s.searchField}>
          <Icon.MapPin />
          <select
            style={{ ...s.searchInput, cursor: "pointer", color: category ? "#374151" : "#94a3b8" }}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="search-btn" style={s.searchBtn} onClick={() => onSearch(query, category)}
          onMouseEnter={e => e.currentTarget.style.background = TEAL_DARK}
          onMouseLeave={e => e.currentTarget.style.background = TEAL}
        >Search</button>
      </div>
    </div>
  );
}

function Sidebar({ activeCat, onSelectCat, onPromo, categories = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="sidebar" style={s.sidebar}>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-filter-btn"
        onClick={() => setMobileOpen(o => !o)}
        style={{ display: "none", alignItems: "center", gap: 8, background: TEAL, color: "#fff", border: "none", padding: "12px 18px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}
      >
        <Icon.Filter /> {mobileOpen ? "Hide Filters" : "Filter by Category"}
      </button>

      <div className={`sidebar-content ${mobileOpen ? "open" : ""}`}>
        {/* Category Card */}
        <div style={s.sideCard}>
          <div style={s.sideHeader}>
            <div style={s.sideTitle}><Icon.Filter /> Categories</div>
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 4 }}
            >
              {collapsed ? <Icon.Plus /> : <Icon.Minus />}
            </button>
          </div>
          {!collapsed && (
            <div>
              {[{ label: "All Categories", value: "" }, ...categories].map((cat, idx, arr) => {
                const value = cat.value !== undefined ? cat.value : cat;
                const label = cat.label !== undefined ? cat.label : cat;
                const isActive = activeCat === value;
                return (
                  <div key={label} onClick={() => onSelectCat(value)}
                    style={{
                      ...s.catItem,
                      borderBottom: idx !== arr.length - 1 ? "1px solid #f9fafb" : "none",
                      background: isActive ? "#f0fdfb" : undefined,
                      color: isActive ? TEAL : "#4b5563",
                      fontWeight: isActive ? 600 : 400,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "#f0fdfb"; e.currentTarget.style.color = TEAL; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#4b5563"; } }}
                  >
                    <span style={{ ...s.catDot, boxShadow: isActive ? `0 0 0 2px rgba(13,148,136,.25)` : "none" }} />
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Promo Banner */}
        <div style={{...s.promo, marginTop: 20}}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, position: "relative", zIndex: 1 }}>Welcome to ClassiGrids</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginBottom: 20, lineHeight: 1.55, position: "relative", zIndex: 1 }}>
            Buy And Sell Everything From Used Cars To Mobile Phones and Computers, Or Jobs And More.
          </p>
          <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, letterSpacing: -2, position: "relative", zIndex: 1 }}>50%</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, position: "relative", zIndex: 1 }}>OFF</div>
          <button style={s.promoBtn} onClick={onPromo}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >Buy Now!</button>
        </div>
      </div>
    </div>
  );
}

function AdCard({ ad, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onOpen(ad)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.adCard,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 10px 24px rgba(59,130,246,.15)" : "none",
        borderColor: hovered ? TEAL : BLUE,
      }}
    >
      <div style={s.adImg}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(0,0,0,.04) 10px,rgba(0,0,0,.04) 11px)" }} />
        <div style={s.wantedStamp}>WANTED</div>
      </div>
      <div style={s.adLabel}>{ad.title}</div>
    </div>
  );
}

function AdModal({ ad, onClose, onSave, onContact }) {
  if (!ad) return null;
  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modalBox}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
          <Icon.Close />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: "#f3f4f6", borderRadius: 6, border: `1px solid ${BLUE}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: RED, letterSpacing: 2, transform: "rotate(-5deg)", flexShrink: 0 }}>WANTED</div>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{ad.title}</h3>
            <span style={{ fontSize: 13, background: "#f0fdfb", color: TEAL, padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>{ad.category}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          {[{ label: "Price", value: ad.price, color: TEAL }, { label: "Location", value: ad.location, color: "#374151" }].map(({ label, value, color }) => (
            <div key={label} style={{ flex: "1 1 100px", background: "#f8fafc", borderRadius: 8, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 24 }}>
          This is a sample listing for <strong>{ad.title}</strong> in the <strong>{ad.category}</strong> category. Contact the seller for more details on pricing and availability.
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onContact(ad)} style={{ flex: 1, padding: 14, background: TEAL, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = TEAL_DARK}
            onMouseLeave={e => e.currentTarget.style.background = TEAL}
          ><Icon.Message /> Contact Seller</button>
          <button onClick={() => onSave(ad)} style={{ flex: "0 0 auto", padding: "14px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = RED; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#374151"; }}
          ><Icon.Heart /> Save</button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push({ type: "page", num: i });
    } else if (i === current - 2 || i === current + 2) {
      pages.push({ type: "ellipsis", key: `e${i}` });
    }
  }

  const btnStyle = (active, disabled) => ({
    ...s.pgBtn,
    background: active ? TEAL : "#fff",
    color: active ? "#fff" : disabled ? "#cbd5e1" : "#64748b",
    borderColor: active ? TEAL : "#e2e8f0",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1,
  });

  return (
    <div style={s.pagination}>
      <button style={btnStyle(false, current === 1)} onClick={() => !( current === 1) && onChange(current - 1)} disabled={current === 1}>
        <Icon.ChevronL />
      </button>
      {pages.map((p, idx) =>
        p.type === "ellipsis"
          ? <span key={p.key} style={{ padding: "0 6px", color: "#94a3b8", fontSize: 16 }}>…</span>
          : <button key={p.num} style={btnStyle(p.num === current, false)} onClick={() => onChange(p.num)}
              onMouseEnter={e => { if (p.num !== current) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = TEAL; } }}
              onMouseLeave={e => { if (p.num !== current) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#64748b"; } }}
            >{p.num}</button>
      )}
      <button style={btnStyle(false, current === total)} onClick={() => !(current === total) && onChange(current + 1)} disabled={current === total}>
        <Icon.ChevronR />
      </button>
    </div>
  );
}

function Toast({ msg, visible }) {
  return (
    <div style={{
      ...s.toast,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(80px)",
    }}>
      {msg}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ClassifiedPage() {
  const [ads, setAds]                 = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCat, setActiveCat]     = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAd, setSelectedAd]   = useState(null);
  const [savedAds, setSavedAds]       = useState([]);
  const [toast, showToast]            = useToast();

  const categories = useMemo(
    () => [...new Set(ads.map((a) => a.category))].sort(),
    [ads]
  );

  useEffect(() => {
    contentApi.getClassified().then((items) => {
      setAds(items.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.subtitle ?? "Others",
        price: `₹${c.price.toLocaleString("en-IN")}`,
        location: c.location ?? "",
      })));
    }).catch(() => { /* API unavailable – ads stays empty */ });
  }, []);

  // Filter logic
  const filteredAds = ads.filter(ad => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || ad.title.toLowerCase().includes(q) || ad.category.toLowerCase().includes(q) || ad.location.toLowerCase().includes(q);
    const matchCat = !activeCat || ad.category === activeCat;
    return matchQ && matchCat;
  });

  const totalPages = Math.ceil(filteredAds.length / ADS_PER_PAGE);
  const pageAds = filteredAds.slice((currentPage - 1) * ADS_PER_PAGE, currentPage * ADS_PER_PAGE);

  const handleSearch = (q, cat) => {
    setSearchQuery(q);
    setActiveCat(cat);
    setCurrentPage(1);
  };

  const handleSelectCat = (cat) => {
    setActiveCat(cat);
    setCurrentPage(1);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = (ad) => {
    setSavedAds(prev => {
      const exists = prev.find(a => a.id === ad.id);
      if (exists) { showToast(`${ad.title} removed from saved`); return prev.filter(a => a.id !== ad.id); }
      showToast(`${ad.title} saved to favourites!`); return [...prev, ad];
    });
    setSelectedAd(null);
  };

  const handleContact = (ad) => {
    showToast(`Message sent to seller of ${ad.title}!`);
    setSelectedAd(null);
  };

  const handlePostAd = () => showToast("Post your ad for free — coming soon!");
  const handlePromo  = () => showToast("Promo applied! 50% off your first ad.");

  return (
    <div style={s.page}>
      
      {/* ── RESPONSIVE CSS INJECTED HERE ── */}
      <style>{`
        /* Typography Scale */
        .hero-title { font-size: clamp(28px, 5vw, 44px) !important; }

        /* Mobile Layout */
        @media (max-width: 900px) {
          .layout-main { flex-direction: column !important; padding: 20px 16px !important; gap: 20px !important; }
          .sidebar { width: 100% !important; }
          .sidebar-content { display: none; }
          .sidebar-content.open { display: block; }
          .mobile-filter-btn { display: flex !important; }
        }
/* Add this inside your existing <style> block */

@media (max-width: 600px) {
  .ad-grid {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }
  
  /* This prevents the card from stretching too wide, keeping it neat */
  .ad-grid > div {
    width: 100% !important;
    max-width: 340px !important; 
  }
}
        /* Stack Search Inputs on Mobile */
        @media (max-width: 600px) {
          .search-wrap { flex-direction: column !important; }
          .search-field { border-right: none !important; border-bottom: 1px solid #e5e7eb !important; min-height: 48px !important; }
          .search-btn { width: 100% !important; border-radius: 0 0 8px 8px !important; min-height: 48px !important; }
        }

        /* Mobile Nav */
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>

      {/* <NavBar onPostAd={handlePostAd} /> */}
      <HeroSearch onSearch={handleSearch} categories={categories} />

      <div className="layout-main" style={s.main}>
        <Sidebar activeCat={activeCat} onSelectCat={handleSelectCat} onPromo={handlePromo} categories={categories} />

        {/* Ad Content */}
        <div style={s.adContent}>
          <div style={s.adHeader}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Business Ads</h2>
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
              Showing {filteredAds.length} ad{filteredAds.length !== 1 ? "s" : ""}
              {savedAds.length > 0 && <span style={{ marginLeft: 12, background: "#fef3c7", color: AMBER, padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>♥ {savedAds.length} saved</span>}
            </span>
          </div>

          {pageAds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: "0 auto 16px", display: "block" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>No ads found</p>
              <p style={{ fontSize: 14 }}>Try a different keyword or category</p>
              <button onClick={() => { setSearchQuery(""); setActiveCat(""); setCurrentPage(1); }} style={{ marginTop: 20, padding: "10px 24px", background: TEAL, color: "#fff", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Clear Filters</button>
            </div>
          ) : (
           <div className="ad-grid" style={s.adGrid}>
  {pageAds.map(ad => (
    <AdCard key={ad.id} ad={ad} onOpen={setSelectedAd} />
  ))}
</div>
          )}

          <Pagination current={currentPage} total={totalPages} onChange={handlePageChange} />
        </div>
      </div>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onSave={handleSave}
          onContact={handleContact}
        />
      )}

      {/* Toast */}
      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}