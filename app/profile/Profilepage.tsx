"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthContext";
import AuthGuard from "@/providers/AuthGuard";
import { useRouter } from "next/navigation";
import { profileApi, type Address as ProfileAddress } from "@/lib/api/profile";
import { notificationsApi } from "@/lib/api/notifications";
import { commerceApi } from "@/lib/api/commerce";
import { catalogApi } from "@/lib/api/catalog";
import { pickProductImage, resolveMediaUrl } from "@/lib/media";
import { resolveCustomerIdFromAccessToken } from "@/lib/resolveCustomerId";
type ActivePage =
  | "profile" | "saved-addresses" | "select-language" | "notification"
  | "your-orders" | "my-bookings" | "reviews-ratings" | "your-favourites" | "refer-earn"
  | "reward-points" | "become-vendor" | "account-privacy" | "logout";

interface SidebarItem { id: ActivePage; label: string; icon: React.ReactNode; } 
const Ic = ({ d, size = 16, sw = "1.8" }: { d: string; size?: number; sw?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }} />
);
 
const IcUser = ({ s = 16 }) => <Ic size={s} d='<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' />;
const IcMapPin = ({ s = 16 }) => <Ic size={s} d='<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' />;
const IcGlobe = ({ s = 16 }) => <Ic size={s} d='<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' />;
const IcBell = ({ s = 16 }) => <Ic size={s} d='<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' />;
const IcPackage = ({ s = 16 }) => <Ic size={s} d='<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' />;
const IcStar = ({ s = 16 }) => <Ic size={s} d='<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' />;
const IcHeart = ({ s = 16 }) => <Ic size={s} d='<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' />;
const IcGift = ({ s = 16 }) => <Ic size={s} d='<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>' />;
const IcAward = ({ s = 16 }) => <Ic size={s} d='<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>' />;
const IcStore = ({ s = 16 }) => <Ic size={s} d='<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' />;
const IcShield = ({ s = 16 }) => <Ic size={s} d='<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' />;
const IcLogOut = ({ s = 16 }) => <Ic size={s} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />;
const IcChevronR = ({ s = 16 }) => <Ic size={s} d='<polyline points="9 18 15 12 9 6"/>' />;
const IcChevronL = ({ s = 16 }) => <Ic size={s} d='<polyline points="15 18 9 12 15 6"/>' />;
const IcPlus = ({ s = 16 }) => <Ic size={s} d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' />;
const IcNav = ({ s = 16 }) => <Ic size={s} d='<polygon points="3 11 22 2 13 21 11 13 3 11"/>' />;
const IcCheck = ({ s = 16 }) => <Ic size={s} d='<polyline points="20 6 9 17 4 12"/>' />;
const IcCamera = ({ s = 16 }) => <Ic size={s} d='<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' />;
const IcX = ({ s = 14 }) => <Ic size={s} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' />;
const IcMenu = ({ s = 20 }) => <Ic size={s} d='<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>' />;
const IcCopy = ({ s = 15 }) => <Ic size={s} d='<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' />;
const IcAlert = ({ s = 16 }) => <Ic size={s} d='<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' />;
const IcCalendar = ({ s = 15 }) => <Ic size={s} d='<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' />;
const IcEdit = ({ s = 14 }) => <Ic size={s} d='<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' />;
const IcTrash = ({ s = 14 }) => <Ic size={s} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' />;
const IcShare = ({ s = 14 }) => <Ic size={s} d='<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' />;
const IcCheckCircle = ({ s = 16 }) => <Ic size={s} d='<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' />;
// notification icons
const IcShoppingBag = ({ s = 18 }) => <Ic size={s} d='<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' />;
const IcTruck = ({ s = 18 }) => <Ic size={s} d='<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' />;
const IcCreditCard = ({ s = 18 }) => <Ic size={s} d='<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' />;
const IcTag = ({ s = 18 }) => <Ic size={s} d='<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>' />;
// reward icons
const IcThumbsUp = ({ s = 20 }) => <Ic size={s} d='<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>' />;
const IcShare2 = ({ s = 20 }) => <Ic size={s} d='<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' />;
const IcUsers = ({ s = 20 }) => <Ic size={s} d='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' />;
const IcTarget = ({ s = 36 }) => <Ic size={s} d='<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' />;
const IcPartyPopper = ({ s = 36 }) => <Ic size={s} d='<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>' />;
// refer icons
const IcUserPlus = ({ s = 20 }) => <Ic size={s} d='<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>' />;
const IcHandshake = ({ s = 20 }) => <Ic size={s} d='<path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>' />;
const IcCoins = ({ s = 20 }) => <Ic size={s} d='<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>' />;
// vendor / waving
const IcSmile = ({ s = 36 }) => <Ic size={s} d='<circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>' />;
// logout wave
const IcLogOutBig = ({ s = 44 }) => <Ic size={s} d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>' />;
const IcTrophy = ({ s = 60 }) => <Ic size={s} d='<line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4h10l1 7H6L7 4z"/><path d="M6 11C6 11 3 11 3 8V4"/><path d="M18 11C18 11 21 11 21 8V4"/>' />;
const IcDollarSign = ({ s = 60 }) => <Ic size={s} d='<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' />;


const PRIMARY_GRADIENT = "radial-gradient(at 60% 25%, rgb(26,74,58) 0%, rgb(14,34,31) 55%, rgb(8,24,18) 100%)";
const PRIMARY_SOLID = "#1a4a3a";


const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "profile", label: "My Profile", icon: <IcUser /> },
  { id: "saved-addresses", label: "Saved Addresses", icon: <IcMapPin /> },
  { id: "select-language", label: "Select Language", icon: <IcGlobe /> },
  { id: "notification", label: "Notifications", icon: <IcBell /> },
  { id: "your-orders", label: "Your Orders", icon: <IcPackage /> },
  { id: "my-bookings", label: "My Bookings", icon: <IcCalendar /> },
  { id: "reviews-ratings", label: "Reviews & Ratings", icon: <IcStar /> },
  { id: "your-favourites", label: "Your Favorites", icon: <IcHeart /> },
  { id: "refer-earn", label: "Refer & Earn", icon: <IcGift /> },
  { id: "reward-points", label: "Reward Points", icon: <IcAward /> },
  { id: "become-vendor", label: "Become a Vendor", icon: <IcStore /> },
  { id: "account-privacy", label: "Account Privacy", icon: <IcShield /> },
  { id: "logout", label: "Log Out", icon: <IcLogOut /> },
];



function orderLineSnapshotThumb(line: { metadata?: unknown } | null | undefined): string | null {
  const m = line?.metadata;
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  const raw =
    (typeof o.thumbnailUrl === "string" && o.thumbnailUrl) ||
    (typeof o.productImage === "string" && o.productImage) ||
    (typeof o.imageUrl === "string" && o.imageUrl) ||
    (typeof o.image === "string" && o.image) ||
    null;
  return resolveMediaUrl(raw);
}

function firstOrderLineVendorLabel(lines: { metadata?: unknown }[], orderVendorId: unknown): string {
  const m = lines[0]?.metadata;
  if (m && typeof m === "object") {
    const v = (m as Record<string, unknown>).vendorName;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (orderVendorId != null && String(orderVendorId).trim()) return String(orderVendorId);
  return "—";
}

function firstOrderLineTitle(lines: { metadata?: unknown; productId?: unknown }[], orderRef: string): string {
  const m = lines[0]?.metadata;
  if (m && typeof m === "object") {
    const n = (m as Record<string, unknown>).productName;
    if (typeof n === "string" && n.trim()) {
      const title = n.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(title);
      const isUnsafeFallback = /^product\s*#\s*[0-9a-f-]{8,}$/i.test(title);
      if (!isUuid && !isUnsafeFallback) return title;
    }
  }
  return `Order ${orderRef.slice(0, 8)}`;
}

function ProductImg({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = typeof src === "string" ? src.trim() : "";
  if (!url || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 text-[10px] font-medium text-center px-1 ${className}`}
        aria-hidden
      >
        No img
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`object-cover rounded-xl bg-slate-100 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: React.ReactNode;
}
const Input: React.FC<InputProps> = ({ label, error, icon, className = "", ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs text-slate-500">{label}</label>}
    <div className="relative">
      <input {...props}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all
          ${error ? "border-red-400 focus:ring-1 focus:ring-red-200" : "border-slate-200 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-100"}
          ${icon ? "pr-9" : ""} ${className}`} />
      {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
    </div>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[];
}
const Select: React.FC<SelectProps> = ({ label, error, options, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs text-slate-500">{label}</label>}
    <select {...props}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all cursor-pointer
        ${error ? "border-red-400 focus:ring-1 focus:ring-red-200" : "border-slate-200 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-100"}`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string;
}
const Textarea: React.FC<TextareaProps> = ({ label, error, className = "", ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs text-slate-500">{label}</label>}
    <textarea {...props}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none resize-none transition-all
        ${error ? "border-red-400 focus:ring-1 focus:ring-red-200" : "border-slate-200 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-100"}
        ${className}`} />
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);
function TabBar<T extends string>({ tabs, active, onSelect }: { tabs: T[]; active: T; onSelect: (t: T) => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-5 w-full">
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)}
          className="flex-1 py-2.5 text-xs font-medium transition-all border-none cursor-pointer"
          style={{ background: active === t ? PRIMARY_GRADIENT : "#fff", color: active === t ? "#fff" : PRIMARY_SOLID }}>
          {t}
        </button>
      ))}
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
    <div className="w-1 h-5 rounded-full" style={{ background: PRIMARY_GRADIENT }} />
    <h2 className="text-base font-semibold text-slate-800">{children}</h2>
  </div>
);

const PrimaryBtn = ({
  children,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-2.5 rounded-xl text-sm text-white font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
    style={{ background: PRIMARY_GRADIENT }}
  >
    {children}
  </button>
);
const GhostBtn = ({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    className={`px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 active:scale-95 cursor-pointer ${className}`}
  >
    {children}
  </button>
);

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4"
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">{children}</div>
  </div>
);

function PageProfile() {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    dob: "",
    gender: "",
    author: false,
    okps: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    profileApi
      .getMe()
      .then((p) => {
        setForm((f) => ({
          ...f,
          name: p.name ?? "",
          mobile: p.phone ?? "",
          email: p.email ?? "",
          dob: p.dob ?? "",
          gender: p.gender ?? "",
        }));
      })
      .catch(() => {
        /* offline or not logged in */
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const setField = (k: string, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.mobile.trim()) e.mobile = "Mobile number is required";
    else if (!/^\d{10}$/.test(form.mobile.trim())) e.mobile = "Must be a valid 10-digit number";
    if (!form.email.trim()) e.email = "Email address is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.gender) e.gender = "Please select your gender";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaveError(null);
    try {
      await profileApi.updateMe({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.mobile.trim(),
        ...(form.dob ? { dob: form.dob } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
          ? (err as Error).message
          : "Could not update profile. Check you are logged in and try again.";
      setSaveError(msg);
    }
  };

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>Personal Information</SectionTitle>
      {loadingProfile && (
        <p className="text-sm text-slate-500 mb-4">Loading your profile…</p>
      )}
      {saved && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <span className="text-emerald-600"><IcCheckCircle /></span> Profile updated successfully!
        </div>
      )}
      {saveError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {saveError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Input label="Full Name *" placeholder="Enter your name" value={form.name}
          onChange={e => setField("name", e.target.value)} error={errors.name} />
        <Input label="Mobile Number *" placeholder="10-digit number" value={form.mobile}
          onChange={e => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} error={errors.mobile} />
        <Input label="Email Address *" placeholder="your@email.com" type="email" value={form.email}
          onChange={e => setField("email", e.target.value)} error={errors.email} />
        <Input label="Date of Birth" type="date" value={form.dob}
          onChange={e => setField("dob", e.target.value)} icon={<IcCalendar />} />
        <Select label="Gender *" value={form.gender} onChange={e => setField("gender", e.target.value)}
          error={errors.gender}
          options={[{ value: "", label: "Select gender" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} />
      </div>
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2">Author Type</p>
        <div className="flex gap-6">
          {[["author", "Author"], ["okps", "Okps"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" checked={form[k as "author" | "okps"]}
                onChange={e => setField(k, e.target.checked)}
                className="w-4 h-4 accent-emerald-700 cursor-pointer" /> {l}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end"><PrimaryBtn onClick={handleSubmit} disabled={loadingProfile}>Update Profile</PrimaryBtn></div>
    </div>
  );
}

type AddressFormState = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const EMPTY_ADDRESS_FORM: AddressFormState = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

function profileAddressToForm(a: ProfileAddress): AddressFormState {
  return {
    label: a.label ?? "",
    fullName: a.fullName ?? "",
    phone: a.phone ?? "",
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  };
}

function formToPayload(f: AddressFormState): Omit<ProfileAddress, "id"> {
  return {
    label: f.label.trim() || "Home",
    fullName: f.fullName.trim(),
    phone: f.phone.trim(),
    line1: f.line1.trim(),
    line2: f.line2.trim() || undefined,
    city: f.city.trim(),
    state: f.state.trim(),
    pincode: f.pincode.trim().replace(/\s/g, ""),
    country: "India",
    isDefault: f.isDefault,
  };
}

function validateAddressForm(f: AddressFormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.fullName.trim()) e.fullName = "Recipient name is required";
  if (!f.phone.trim()) e.phone = "Phone number is required";
  else if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ""))) e.phone = "Enter a valid 10-digit mobile number";
  if (!f.line1.trim()) e.line1 = "Address line 1 is required (house / street)";
  if (!f.city.trim()) e.city = "City is required";
  if (!f.state.trim()) e.state = "State is required";
  if (!f.pincode.trim()) e.pincode = "PIN code is required";
  else if (!/^\d{6}$/.test(f.pincode.replace(/\s/g, ""))) e.pincode = "Enter a valid 6-digit PIN code";
  return e;
}

function SavedAddressFormFields({
  values,
  errors,
  onChange,
  idPrefix,
}: {
  values: AddressFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<AddressFormState>) => void;
  idPrefix: string;
}) {
  const digitsPhone = (v: string) => v.replace(/\D/g, "").slice(0, 10);
  const digitsPin = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Address label (e.g. Home, Office)"
          value={values.label}
          onChange={(ev) => onChange({ label: ev.target.value })}
          error={errors.label}
        />
        <Input
          placeholder="Recipient full name *"
          value={values.fullName}
          onChange={(ev) => onChange({ fullName: ev.target.value })}
          error={errors.fullName}
        />
      </div>
      <Input
        placeholder="Mobile number (10 digits) *"
        value={values.phone}
        onChange={(ev) => onChange({ phone: digitsPhone(ev.target.value) })}
        error={errors.phone}
      />
      <Input
        placeholder="Address line 1 — flat, house no., street *"
        value={values.line1}
        onChange={(ev) => onChange({ line1: ev.target.value })}
        error={errors.line1}
      />
      <Input
        placeholder="Address line 2 — area, landmark (optional)"
        value={values.line2}
        onChange={(ev) => onChange({ line2: ev.target.value })}
        error={errors.line2}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="City *"
          value={values.city}
          onChange={(ev) => onChange({ city: ev.target.value })}
          error={errors.city}
        />
        <Input
          placeholder="State *"
          value={values.state}
          onChange={(ev) => onChange({ state: ev.target.value })}
          error={errors.state}
        />
      </div>
      <Input
        placeholder="PIN code (6 digits) *"
        value={values.pincode}
        onChange={(ev) => onChange({ pincode: digitsPin(ev.target.value) })}
        error={errors.pincode}
      />
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          id={`${idPrefix}-default`}
          checked={values.isDefault}
          onChange={(ev) => onChange({ isDefault: ev.target.checked })}
          className="w-4 h-4 accent-emerald-700 rounded border-slate-300"
        />
        Set as default delivery address
      </label>
    </div>
  );
}

function PageSavedAddresses() {
  const [showMap, setShowMap] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mapForm, setMapForm] = useState<AddressFormState>({ ...EMPTY_ADDRESS_FORM });
  const [mapErrors, setMapErrors] = useState<Record<string, string>>({});
  const [addrForm, setAddrForm] = useState<AddressFormState>({ ...EMPTY_ADDRESS_FORM });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);

  useEffect(() => {
    profileApi
      .getAddresses()
      .then((items) => setAddresses(items))
      .catch(() => {});
  }, []);

  const applyAddrPatch = (patch: Partial<AddressFormState>) => {
    setAddrForm((f) => ({ ...f, ...patch }));
    setAddrErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const applyMapPatch = (patch: Partial<AddressFormState>) => {
    setMapForm((f) => ({ ...f, ...patch }));
    setMapErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const runValidate = (f: AddressFormState, setE: (e: Record<string, string>) => void) => {
    const e = validateAddressForm({ ...f, phone: f.phone.replace(/\D/g, "") });
    setE(e);
    return Object.keys(e).length === 0;
  };

  const addFromMap = async () => {
    const f = { ...mapForm, phone: mapForm.phone.replace(/\D/g, "") };
    if (!runValidate(f, setMapErrors)) return;
    try {
      const created = await profileApi.createAddress(formToPayload(f));
      setAddresses((a) => [created, ...a]);
    } catch {
      /* optional toast */
    }
    setMapForm({ ...EMPTY_ADDRESS_FORM });
    setMapErrors({});
    setShowMap(false);
  };

  const saveNewAddr = async () => {
    const f = { ...addrForm, phone: addrForm.phone.replace(/\D/g, "") };
    if (!runValidate(f, setAddrErrors)) return;
    try {
      const created = await profileApi.createAddress(formToPayload(f));
      setAddresses((a) => [created, ...a]);
    } catch {
      /* optional toast */
    }
    setAddrForm({ ...EMPTY_ADDRESS_FORM });
    setAddrErrors({});
    setShowAddForm(false);
  };

  const startEdit = (a: ProfileAddress) => {
    setEditId(a.id);
    setAddrForm(profileAddressToForm(a));
    setAddrErrors({});
    setShowAddForm(false);
  };

  const saveEdit = async () => {
    const f = { ...addrForm, phone: addrForm.phone.replace(/\D/g, "") };
    if (!runValidate(f, setAddrErrors)) return;
    if (editId == null) return;
    try {
      const updated = await profileApi.updateAddress(editId, formToPayload(f));
      setAddresses((a) => a.map((x) => (x.id === editId ? updated : x)));
    } catch {
      /* optional toast */
    }
    setEditId(null);
    setAddrForm({ ...EMPTY_ADDRESS_FORM });
    setAddrErrors({});
  };

  const cancelEdit = () => {
    setEditId(null);
    setAddrForm({ ...EMPTY_ADDRESS_FORM });
    setAddrErrors({});
  };

  const removeAddress = async (id: string | number) => {
    try {
      await profileApi.deleteAddress(id);
    } catch {
      /* still remove locally if needed */
    }
    setAddresses((a) => a.filter((x) => x.id !== id));
  };

  const formatAddressLines = (a: ProfileAddress) =>
    [a.line1, a.line2, [a.city, a.state, a.pincode].filter(Boolean).join(", ")].filter(Boolean);

  return (
    <div className="p-5 sm:p-6">
      {showMap && (
        <Modal
          onClose={() => {
            setShowMap(false);
            setMapForm({ ...EMPTY_ADDRESS_FORM });
            setMapErrors({});
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Add address</span>
            <button
              type="button"
              onClick={() => {
                setShowMap(false);
                setMapForm({ ...EMPTY_ADDRESS_FORM });
                setMapErrors({});
              }}
              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
            >
              <IcX />
            </button>
          </div>
          <div className="relative h-36 overflow-hidden" style={{ background: "linear-gradient(160deg,#c7f1e3 0%,#a0e4cc 40%,#7dd3b8 100%)" }}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="w-9 h-9 rounded-full border-4 border-white flex items-center justify-center shadow-lg"
                style={{ background: PRIMARY_GRADIENT }}
              >
                <span className="text-white">
                  <IcMapPin s={14} />
                </span>
              </div>
            </div>
            <p className="absolute bottom-2 left-3 right-3 text-center text-[10px] text-slate-600">
              Enter delivery details below (matches profile API: line1, city, state, PIN).
            </p>
          </div>
          <div className="p-5 space-y-3">
            <SavedAddressFormFields values={mapForm} errors={mapErrors} onChange={applyMapPatch} idPrefix="map" />
            <div className="flex gap-3 pt-1">
              <PrimaryBtn type="button" onClick={addFromMap} className="flex-1">
                Save address
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      <SectionTitle>Saved Addresses</SectionTitle>
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="flex items-center gap-2 text-sm border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2 hover:bg-emerald-50 cursor-pointer transition-all"
        >
          <IcNav /> Add from map view
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAddForm((v) => !v);
            setEditId(null);
            setAddrErrors({});
          }}
          className="flex items-center gap-2 text-sm text-white rounded-xl px-4 py-2 cursor-pointer transition-all"
          style={{ background: PRIMARY_GRADIENT }}
        >
          <IcPlus /> {showAddForm ? "Cancel" : "Add New Address"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-5 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-3">
          <p className="text-xs font-medium text-slate-700">New address</p>
          <SavedAddressFormFields values={addrForm} errors={addrErrors} onChange={applyAddrPatch} idPrefix="new" />
          <div className="flex gap-3">
            <PrimaryBtn type="button" onClick={saveNewAddr}>
              Save Address
            </PrimaryBtn>
            <GhostBtn
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddrErrors({});
              }}
            >
              Cancel
            </GhostBtn>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className="mb-5 p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-3">
          <p className="text-xs font-medium text-slate-700">Edit address</p>
          <SavedAddressFormFields values={addrForm} errors={addrErrors} onChange={applyAddrPatch} idPrefix="edit" />
          <div className="flex gap-3">
            <PrimaryBtn type="button" onClick={saveEdit}>
              Save Changes
            </PrimaryBtn>
            <GhostBtn type="button" onClick={cancelEdit}>
              Cancel
            </GhostBtn>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {addresses.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            No saved addresses yet. Add one for faster checkout.
          </p>
        )}
        {addresses.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-100 hover:shadow-sm transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5"
              style={{ background: PRIMARY_GRADIENT }}
            >
              <IcStore />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-800">{a.label || "Address"}</p>
                {a.isDefault && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Default
                  </span>
                )}
              </div>
              {(a.fullName || a.phone) && (
                <p className="text-xs text-slate-600 mt-1">
                  {[a.fullName, a.phone].filter(Boolean).join(" · ")}
                </p>
              )}
              {formatAddressLines(a).map((line, i) => (
                <p key={i} className="text-xs text-slate-500 mt-0.5 break-words">
                  {line}
                </p>
              ))}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(a)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
              >
                <IcEdit />
              </button>
              <button
                type="button"
                onClick={() => removeAddress(a.id)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
              >
                <IcTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
 
function PageSelectLanguage() {
  const [selected, setSelected] = useState("English");
  const langs = ["English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];
  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>Language</SectionTitle>
      <div className="space-y-1">
        {langs.map(lang => (
          <button key={lang} onClick={() => setSelected(lang)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left cursor-pointer border ${selected === lang ? "border-emerald-200 bg-emerald-50" : "border-transparent hover:bg-slate-50"}`}>
            <span className={`text-sm ${selected === lang ? "text-emerald-900 font-medium" : "text-slate-700"}`}>{lang}</span>
            {selected === lang && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: PRIMARY_GRADIENT }}><IcCheck /></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
 
function PageNotification() {
  type NotifItem = { id: number; read: boolean; icon: React.ReactNode; title: string; body: string; time: string; color: string; iconBg: string };
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  useEffect(() => {
    notificationsApi.getMyNotifications({ limit: 50 }).then((apiItems) => {
      if (!apiItems.length) return;
      setNotifications(apiItems.map((n) => ({
        id: n.id,
        read: n.isRead,
        icon: <IcBell />,
        title: n.title || "Notification",
        body: n.body || "",
        time: new Date(n.createdAt).toLocaleString(),
        color: n.isRead ? "bg-slate-50 border-slate-100" : "bg-emerald-50 border-emerald-100",
        iconBg: n.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700",
      })));
    }).catch(() => {});
  }, []);
  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    await Promise.allSettled(unreadIds.map((id) => notificationsApi.markAsRead(id)));
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: PRIMARY_GRADIENT }} />
          <h2 className="text-base font-semibold text-slate-800">All Notifications</h2>
          {unread > 0 && <span className="px-2 py-0.5 rounded-full text-xs text-white" style={{ background: PRIMARY_GRADIENT }}>{unread} new</span>}
        </div>
        {unread > 0 && <button onClick={markAllRead} className="text-xs cursor-pointer font-medium" style={{ color: PRIMARY_SOLID }}>Mark all read</button>}
      </div>
      <div className="space-y-2">
        {notifications.map(n => (
          <div key={n.id} onClick={() => {
            notificationsApi.markAsRead(n.id).catch(() => {});
            setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x));
          }}
            className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${n.read ? "bg-white border-slate-100" : n.color}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.iconBg}`}>{n.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm leading-snug ${n.read ? "text-slate-700" : "text-slate-900 font-medium"}`}>{n.title}</p>
                <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.body}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: PRIMARY_SOLID }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
 
type OrderTab = "Shop" | "Services" | "Booking";

const SHOP_ORDERS: { id: string; title: string; sub: string; vendor: string; img: string; orig: string; price: string; off: string; status: string; statusColor: string; date: string }[] = [];
const SERVICE_ORDERS: typeof SHOP_ORDERS = [];
const BOOKING_ORDERS: typeof SHOP_ORDERS = [];

function OrderCard({ item }: { item: typeof SHOP_ORDERS[0] }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition-all">
      <ProductImg src={item.img} alt={item.title} className="w-16 h-20 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium">{item.id}</p>
        <p className="text-sm font-medium text-slate-800 leading-snug mt-0.5">{item.title}</p>
        <p className="text-xs text-slate-400">{item.sub}</p>
        <p className="text-xs text-slate-400">Vendor: {item.vendor}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-slate-300 line-through">{item.orig}</span>
          <span className="text-sm font-semibold text-slate-800">{item.price}</span>
          <span className="text-xs font-medium" style={{ color: PRIMARY_SOLID }}>{item.off}</span>
        </div>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.statusColor }} />
            <span className="text-xs font-medium" style={{ color: item.statusColor }}>{item.status}</span>
          </div>
          <span className="text-[10px] text-slate-400">{item.date}</span>
        </div>
      </div>
    </div>
  );
}

function PageYourOrders() {
  const [tab, setTab] = useState<OrderTab>("Shop");
  const [apiOrders, setApiOrders] = useState<any[]>([]);
  const data = apiOrders.length ? apiOrders : (tab === "Shop" ? SHOP_ORDERS : tab === "Services" ? SERVICE_ORDERS : BOOKING_ORDERS);

  useEffect(() => {
    const token = localStorage.getItem("p4u_token");
    const customerId =
      localStorage.getItem("p4u_customer_id") || resolveCustomerIdFromAccessToken(token) || "";
    if (!customerId) return;
    if (!localStorage.getItem("p4u_customer_id")) {
      localStorage.setItem("p4u_customer_id", customerId);
    }
    commerceApi
      .getOrders(customerId, { limit: 50 })
      .then(async (res: any) => {
        const list = res.data;
        if (!list?.length) return;

        type Row = { o: any; lines: any[]; imgMeta: string | null };
        const mapped: Row[] = list.map((o: any) => {
          const lines = Array.isArray(o.items)
            ? o.items
            : Array.isArray(o.metadata?.lines)
              ? o.metadata.lines
              : [];
          const imgMeta = lines.length ? orderLineSnapshotThumb(lines[0]) : null;
          return { o, lines, imgMeta };
        });

        const needIds = new Set<string>();
        for (const row of mapped) {
          if (row.imgMeta) continue;
          const pid = row.lines[0]?.productId;
          if (pid != null && String(pid).trim()) needIds.add(String(pid));
        }

        const thumbByProductId: Record<string, string | null> = {};
        await Promise.all(
          Array.from(needIds).map(async (pid) => {
            try {
              const p = await catalogApi.getProduct(pid);
              thumbByProductId[pid] = pickProductImage(p as Parameters<typeof pickProductImage>[0]);
            } catch {
              thumbByProductId[pid] = null;
            }
          }),
        );

        setApiOrders(
          mapped.map(({ o, lines, imgMeta }) => {
            const itemCount = lines.reduce((s: number, l: any) => s + (l.quantity || 1), 0);
            const statusColor =
              o.status === "delivered" || o.status === "completed"
                ? "#22c55e"
                : o.status === "cancelled"
                  ? "#ef4444"
                  : o.status === "created" || o.status === "pending"
                    ? "#f59e0b"
                    : "#3b82f6";
            const orderRef = String(o.orderRef || o.id);
            const pid = lines[0]?.productId != null ? String(lines[0].productId) : "";
            const fromCatalog = pid ? thumbByProductId[pid] : null;
            const imgUrl = imgMeta || fromCatalog || "";
            const total = o.totalAmount ?? 0;
            const priceStr =
              typeof total === "number"
                ? total.toFixed(2)
                : String(total);
            return {
              id: orderRef,
              img: imgUrl,
              title: firstOrderLineTitle(lines, orderRef),
              sub: `${itemCount} item${itemCount !== 1 ? "s" : ""}`,
              vendor: firstOrderLineVendorLabel(lines, o.vendorId),
              orig: "",
              price: `₹${priceStr}`,
              off: "",
              status: o.status,
              statusColor,
              date: new Date(o.createdAt).toLocaleDateString(),
            };
          }),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>My Orders</SectionTitle>
      <TabBar<OrderTab> tabs={["Shop", "Services", "Booking"]} active={tab} onSelect={setTab} />
      <div className="space-y-3">{data.map((o, i) => <OrderCard key={i} item={o} />)}</div>
    </div>
  );
}

function PageMyBookings() {
  const [bookings, setBookings] = useState<
    Array<{ id: string; date?: string; slot?: string; timeSlot?: string; status: string }>
  >([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    commerceApi
      .getBookings({ limit: 50 })
      .then(async (res) => {
        const rows = res.data ?? [];
        setBookings(rows);
        const vendorIds = [...new Set(rows.map((b: any) => String(b.vendorId || "").trim()).filter(Boolean))];
        const serviceIds = [...new Set(rows.map((b: any) => String(b.serviceId || "").trim()).filter(Boolean))];
        const [vendors, services] = await Promise.all([
          Promise.all(
            vendorIds.map(async (id) => {
              try {
                const v = await catalogApi.getVendor(id);
                return [id, v?.businessName || v?.name || "Service Vendor"] as const;
              } catch {
                return [id, "Service Vendor"] as const;
              }
            }),
          ),
          Promise.all(
            serviceIds.map(async (id) => {
              try {
                const s = await catalogApi.getService(id);
                return [id, s?.name || "Service"] as const;
              } catch {
                return [id, "Service"] as const;
              }
            }),
          ),
        ]);
        setVendorNames(Object.fromEntries(vendors));
        setServiceNames(Object.fromEntries(services));
      })
      .catch(() => setError("Unable to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const cancelBooking = async (id: string) => {
    try {
      const updated = await commerceApi.cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: String(updated.status ?? b.status), date: updated.date ?? b.date, slot: updated.slot ?? b.slot }
            : b,
        ),
      );
    } catch {
      alert("Failed to cancel booking");
    }
  };

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>My Bookings</SectionTitle>

      {loading && <p className="text-sm text-slate-500 py-6">Loading bookings…</p>}
      {error && <p className="text-sm text-red-500 py-4">{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
          No bookings yet.
        </p>
      )}

      <div className="space-y-3">
        {bookings.map((b) => {
          const st = String(b.status || "").toLowerCase();
          const statusClass =
            st === "approved" || st === "confirmed"
              ? "bg-green-100 text-green-700"
              : st === "rejected" || st === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700";
          return (
            <div key={b.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {serviceNames[String((b as any).serviceId || "").trim()] || "Service Booking"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor: {vendorNames[String((b as any).vendorId || "").trim()] || "Service Vendor"}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <IcCalendar s={12} />
                    {b.date ? new Date(b.date).toLocaleDateString() : "—"}
                  </span>
                  <span>{b.slot || b.timeSlot || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{st || "pending"}</span>
                <span className="text-[10px] text-slate-400">#{String(b.id).slice(0, 8)}</span>
                {st !== "cancelled" && st !== "rejected" && (
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => cancelBooking(b.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
type ReviewTab = "Shop" | "Services" | "Booking";

const SHOP_REVIEWS: { id: number; img: string; title: string; rating: number; label: string; comment: string; date: string }[] = [];
const SERVICE_REVIEWS: typeof SHOP_REVIEWS = [];
const BOOKING_REVIEWS: typeof SHOP_REVIEWS = [];

function PageReviews() {
  const [tab, setTab] = useState<ReviewTab>("Shop");
  const [showForm, setShowForm] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | number | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiReviewMap, setApiReviewMap] = useState<Record<number, { rating: number; comment?: string; date?: string }>>({});
  const data = tab === "Shop" ? SHOP_REVIEWS : tab === "Services" ? SERVICE_REVIEWS : BOOKING_REVIEWS;
  const ratingLabels = ["", "Bad", "OK", "Good", "Very Good", "Excellent"];

  useEffect(() => {
    const targetType = tab === "Shop" ? "product" : tab === "Services" ? "service" : "booking";
    Promise.all(
      data.map((item) =>
        commerceApi
          .getReviews(targetType, item.id)
          .then((rows) => ({ id: item.id, row: rows[0] }))
          .catch(() => ({ id: item.id, row: undefined }))
      )
    ).then((results) => {
      const next: Record<number, { rating: number; comment?: string; date?: string }> = {};
      for (const r of results) {
        if (r.row) {
          next[r.id] = {
            rating: r.row.rating,
            comment: r.row.comment,
            date: new Date(r.row.createdAt).toLocaleDateString(),
          };
        }
      }
      setApiReviewMap(next);
    });
  }, [tab]);

  const submit = async () => {
    const e: { rating?: string; text?: string } = {};
    if (rating === 0) e.rating = "Please select a star rating";
    if (!reviewText.trim()) e.text = "Please write your review";
    setErrors(e); if (Object.keys(e).length > 0) return;
    const targetType = tab === "Shop" ? "product" : tab === "Services" ? "service" : "booking";
    if (selectedTargetId) {
      try {
        await commerceApi.createReview({
          targetType,
          targetId: selectedTargetId,
          rating,
          comment: reviewText.trim(),
        });
        setApiReviewMap((prev) => ({
          ...prev,
          [selectedTargetId]: {
            rating,
            comment: reviewText.trim(),
            date: new Date().toLocaleDateString(),
          },
        }));
      } catch {
        // Keep local success UX even when review API rejects target IDs from demo data.
      }
    }
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setShowForm(false); setRating(0); setReviewText(""); }, 2500);
  };

  if (showForm) return (
    <div className="p-5 sm:p-6">
      <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-emerald-700 cursor-pointer">
        <IcChevronL /> Back to reviews
      </button>
      <SectionTitle>Write a Review</SectionTitle>
      <div className="mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
        <p className="text-xs font-medium text-slate-700 mb-2">Tips for a great review</p>
        {["Mention specific features you liked or disliked", "Compare with similar products if possible", "Be honest and describe your actual experience"].map((q, i) => (
          <p key={i} className="text-xs text-slate-500 mb-1">• {q}</p>
        ))}
      </div>
      <div className="mb-5">
        <p className="text-xs text-slate-500 mb-2">Star Rating *</p>
        <div className="flex gap-1 mb-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => { setRating(n); setErrors(e => ({ ...e, rating: undefined })); }}
              className="text-3xl transition-transform hover:scale-110 border-none bg-transparent cursor-pointer"
              style={{ color: n <= rating ? "#f59e0b" : "#e2e8f0" }}>★</button>
          ))}
        </div>
        {rating > 0 && <p className="text-xs font-medium text-emerald-700">{ratingLabels[rating]}</p>}
        {errors.rating && <p className="text-xs text-red-500 mt-1">{errors.rating}</p>}
      </div>
      <div className="mb-5">
        <Textarea label="Your Review *" rows={4} value={reviewText}
          onChange={e => { setReviewText(e.target.value); setErrors(ev => ({ ...ev, text: undefined })); }}
          placeholder="Share your experience..." error={errors.text} />
      </div>
      {submitted ? (
        <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium"><IcCheckCircle /> Review submitted! Thank you.</div>
      ) : (
        <div className="flex justify-end"><PrimaryBtn onClick={submit}>Submit Review</PrimaryBtn></div>
      )}
    </div>
  );

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>My Reviews & Ratings</SectionTitle>
      <TabBar<ReviewTab> tabs={["Shop", "Services", "Booking"]} active={tab} onSelect={setTab} />
      <div className="space-y-3">
        {data.map(r => {
          const apiReview = apiReviewMap[r.id];
          const ratingValue = apiReview?.rating ?? r.rating;
          const commentValue = apiReview?.comment ?? r.comment;
          const dateValue = apiReview?.date ?? r.date;
          const labelValue = ratingLabels[ratingValue] || r.label;
          return (
          <div key={r.id} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition-all">
            <ProductImg src={r.img} alt={r.title} className="w-14 h-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-snug">{r.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-white text-xs" style={{ background: "#22c55e" }}>{ratingValue}.0 ★</span>
                <span className="text-xs text-slate-500">{labelValue}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{commentValue}</p>
              <p className="text-[10px] text-slate-300 mt-1">Reviewed on {dateValue}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => { setSelectedTargetId(r.id); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"><IcEdit /></button>
              <button className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"><IcTrash /></button>
              <button className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer"><IcShare /></button>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
 
type FavTab = "Shop" | "Services" | "Booking";

const initShopFavs: { id: number; img: string; title: string; sub: string; vendor: string; orig: string; price: string; off: string; liked: boolean }[] = [];
const initServiceFavs: typeof initShopFavs = [];
const initBookingFavs: typeof initShopFavs = [];

function PageFavourites() {
  const [tab, setTab] = useState<FavTab>("Shop");
  const [shopFavs, setShopFavs] = useState(initShopFavs);

  useEffect(() => {
    profileApi.getWishlist().then((items) => {
      if (items.length) {
        setShopFavs(items.map((w) => ({
          id: w.id, img: w.productImage ?? "", title: w.productName ?? `Product #${w.productId}`,
          sub: "", vendor: "", orig: "", price: w.productPrice ? `₹${w.productPrice}` : "",
          off: "", liked: true, apiProductId: w.productId,
        })) as any);
      }
    }).catch(() => {});
  }, []);
  const [serviceFavs, setServiceFavs] = useState(initServiceFavs);
  const [bookingFavs, setBookingFavs] = useState(initBookingFavs);

  const getList = () => tab === "Shop" ? shopFavs : tab === "Services" ? serviceFavs : bookingFavs;
  const getSetter = () => tab === "Shop" ? setShopFavs : tab === "Services" ? setServiceFavs : setBookingFavs;
  const toggle = async (id: number) => {
    if (tab === "Shop") {
      const item = shopFavs.find((x) => x.id === id) as (typeof initShopFavs[number] & { apiProductId?: number }) | undefined;
      if (!item) return;
      const productId = item.apiProductId ?? item.id;
      setShopFavs((list) => list.map((x) => x.id === id ? { ...x, liked: !x.liked } : x));
      try {
        if (item.liked) {
          await profileApi.removeFromWishlist(productId);
        } else {
          await profileApi.addToWishlist(productId);
        }
      } catch {
        // Revert on failure to keep UI consistent with backend.
        setShopFavs((list) => list.map((x) => x.id === id ? { ...x, liked: item.liked } : x));
      }
      return;
    }
    (getSetter() as React.Dispatch<React.SetStateAction<typeof initShopFavs>>)(list => list.map(x => x.id === id ? { ...x, liked: !x.liked } : x));
  };

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>My Favorites</SectionTitle>
      <TabBar<FavTab> tabs={["Shop", "Services", "Booking"]} active={tab} onSelect={setTab} />
      <div className="space-y-3">
        {getList().map(item => (
          <div key={item.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:shadow-sm transition-all">
            <ProductImg src={item.img} alt={item.title} className="w-16 h-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-snug">{item.title}</p>
              <p className="text-xs text-slate-400">{item.sub}</p>
              <p className="text-xs text-slate-400">Vendor: {item.vendor}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-300 line-through">{item.orig}</span>
                <span className="text-sm font-semibold text-slate-800">{item.price}</span>
                <span className="text-xs font-medium" style={{ color: PRIMARY_SOLID }}>{item.off}</span>
              </div>
            </div>
            <button onClick={() => toggle(item.id)} className="shrink-0 p-2 transition-transform hover:scale-110 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill={item.liked ? "#ef4444" : "none"}
                stroke={item.liked ? "#ef4444" : "#cbd5e1"}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 
function PageReferEarn() {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("P4U2000");

  useEffect(() => {
    profileApi.getReferralCode().then((res) => {
      if (res.code) setCode(res.code);
    }).catch(() => {});
  }, []);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => { });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, []);

  const steps = [
    { icon: <IcUserPlus s={20} />, label: "Refer a Friend", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    { icon: <IcHandshake s={20} />, label: "Friend Joins", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    { icon: <IcCoins s={20} />, label: "Earn Points", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  ];

  return (
    <div className="p-5 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <SectionTitle>Refer & Earn</SectionTitle>
        <div className="rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ background: PRIMARY_GRADIENT }}>
          <div className="relative z-10">
            <p className="text-white/70 text-xs mb-1">Your current balance</p>
            <p className="text-white text-3xl font-semibold">300 <span className="text-lg text-white/60">Pts</span></p>
            <p className="text-white/50 text-xs mt-1">Earn 150 pts for every friend who joins</p>
          </div>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white opacity-10"><IcDollarSign s={72} /></div>
        </div>
        <div className="flex items-center justify-between gap-1 mb-6">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${s.bg} ${s.border} ${s.text}`}>{s.icon}</div>
                <p className="text-xs text-slate-500 text-center leading-tight">{s.label}</p>
              </div>
              {i < 2 && <div className="text-slate-300 text-sm pb-4">›</div>}
            </React.Fragment>
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden border-2" style={{ borderColor: PRIMARY_SOLID }}>
          <div className="flex-1 px-5 py-3 bg-white">
            <p className="text-[10px] text-slate-400 mb-0.5">Referral Code</p>
            <p className="text-lg font-semibold text-slate-800 tracking-widest">{code}</p>
          </div>
          <button onClick={handleCopy}
            className="px-5 py-3 text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-all"
            style={{ background: PRIMARY_GRADIENT, opacity: copied ? 0.85 : 1 }}>
            <IcCopy /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
type RewardTab = "Earned" | "Redeemed";

function PageRewardPoints() {
  const [tab, setTab] = useState<RewardTab>("Earned");
  const [totalPoints, setTotalPoints] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; points: number; balanceAfter: number; type: string; description: string | null; createdAt: string }>>([]);

  useEffect(() => {
    profileApi.getRewardPoints().then((res) => {
      if (res.balance != null) setTotalPoints(res.balance);
      if (Array.isArray(res.recentHistory)) setHistory(res.recentHistory);
    }).catch(() => {});
  }, []);

  const earned   = history.filter((h) => h.points > 0);
  const redeemed = history.filter((h) => h.points < 0);

  const labelForType = (t: string): string => {
    const map: Record<string, string> = {
      welcome_bonus: "Welcome bonus",
      referral_bonus: "Referral bonus",
      customer_referral: "Customer referral",
      post_like: "Liked a post",
      post_share: "Shared a post",
      story_like: "Liked a story",
      order_redeem: "Redeemed at checkout",
    };
    return map[t] || t.replace(/_/g, " ");
  };

  return (
    <div className="p-5 sm:p-6">
      <SectionTitle>Reward Points</SectionTitle>
      <div className="rounded-2xl p-5 mb-5 relative overflow-hidden" style={{ background: PRIMARY_GRADIENT }}>
        <div className="relative z-10">
          <p className="text-white/70 text-xs mb-1">Total Points Available</p>
          <p className="text-white text-4xl font-semibold">{totalPoints}</p>
          <p className="text-white/50 text-xs mt-1.5">1 point = ₹1 at checkout · cap depends on vendor</p>
        </div>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white opacity-10"><IcTrophy s={72} /></div>
      </div>
      <TabBar<RewardTab> tabs={["Earned", "Redeemed"]} active={tab} onSelect={setTab} />
      {tab === "Earned" ? (
        earned.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-36 gap-3">
            <div className="text-slate-300"><IcTarget s={48} /></div>
            <p className="text-sm text-slate-400">No points earned yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {earned.map((e) => (
              <div key={e.id} className="rounded-xl p-3 flex items-center justify-between border" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{labelForType(e.type)}</p>
                  <p className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: "#059669" }}>+{e.points}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        redeemed.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-36 gap-3">
            <div className="text-slate-300"><IcTarget s={48} /></div>
            <p className="text-sm text-slate-400">No points redeemed yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {redeemed.map((r) => (
              <div key={r.id} className="rounded-xl p-3 flex items-center justify-between border" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{labelForType(r.type)}</p>
                  <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>{r.points}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
 
function PageBecomeVendor() {
  const [showModal, setShowModal] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ shopName: "", gst: "", category: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if already submitted
  useEffect(() => {
    const { vendorApi } = require("@/lib/api/vendor");
    vendorApi.getRegistrationStatus().then((res: any) => {
      if (res.status) setDone(true);
    }).catch(() => {});
  }, []);

  const setField = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.shopName.trim()) e.shopName = "Shop name is required";
    if (!form.category) e.category = "Please select a category";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "Please describe your shop";
    setErrors(e); return Object.keys(e).length === 0;
  };

  if (done) return (
    <div className="p-5 sm:p-6 flex flex-col items-center justify-center min-h-64 gap-4">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600"><IcPartyPopper s={32} /></div>
      <p className="text-base font-semibold text-slate-800">Application Submitted!</p>
      <p className="text-sm text-slate-500 text-center">We&apos;ll review your application and get back to you within 2-3 business days.</p>
    </div>
  );

  return (
    <div className="p-5 sm:p-6">
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-7 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600"><IcSmile s={32} /></div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Ready to Become a Vendor?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">Join thousands of sellers on our platform and start selling today.</p>
            <div className="flex gap-3">
              <GhostBtn onClick={() => setShowModal(false)} className="flex-1">Not Now</GhostBtn>
              <PrimaryBtn onClick={() => setShowModal(false)} className="flex-1">Let&apos;s Go!</PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}
      <SectionTitle>Become a Vendor</SectionTitle>
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map(s => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${step >= s ? "text-white" : "bg-slate-100 text-slate-400"}`}
                style={step >= s ? { background: PRIMARY_GRADIENT } : {}}>
                {step > s ? <IcCheck /> : s}
              </div>
              <span className={`text-xs ${step >= s ? "font-medium" : "text-slate-400"}`} style={step >= s ? { color: PRIMARY_SOLID } : {}}>
                {s === 1 ? "Shop Details" : "Description"}
              </span>
            </div>
            {s < 2 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
          </React.Fragment>
        ))}
      </div>
      {step === 1 ? (
        <div className="space-y-4">
          <Input label="Shop Name *" placeholder="Your shop name" value={form.shopName} onChange={e => setField("shopName", e.target.value)} error={errors.shopName} />
          <Input label="GST Number (Optional)" placeholder="22AAAAA0000A1Z5" value={form.gst} onChange={e => setField("gst", e.target.value.toUpperCase())} />
          <Select label="Category *" value={form.category} onChange={e => setField("category", e.target.value)} error={errors.category}
            options={[{ value: "", label: "Select category" }, { value: "electronics", label: "Electronics" }, { value: "clothing", label: "Clothing" }, { value: "groceries", label: "Groceries" }, { value: "restaurants", label: "Restaurants" }, { value: "services", label: "Services" }]} />
          <div className="flex justify-end pt-2">
            <PrimaryBtn onClick={() => { if (validateStep1()) setStep(2); }}>Next Step →</PrimaryBtn>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea label="Shop Description *" rows={4} value={form.description}
            onChange={e => setField("description", e.target.value)}
            placeholder="Tell customers about your shop, what you sell, and why they should choose you..."
            error={errors.description} />
          <div className="flex gap-3 pt-2">
            <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
            <PrimaryBtn onClick={async () => {
              if (!validateStep2()) return;
              setSubmitting(true);
              try {
                const { vendorApi } = await import("@/lib/api/vendor");
                await vendorApi.register({ businessName: form.shopName, description: form.description, phone: "" });
              } catch { /* continue even if API fails */ }
              setSubmitting(false);
              setDone(true);
            }}>{submitting ? "Submitting..." : "Submit Application"}</PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}
  
function ChangePasswordBlock() {
  // Password auth has been removed in favour of phone OTP. The block stays
  // visible so the layout stays consistent, but it just explains the new
  // sign-in model. Re-enable when/if password auth is reintroduced.
  return (
    <div className="mb-6">
      <SectionTitle>Sign-in method</SectionTitle>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Your account uses phone OTP for sign-in. There is no password to change.
        Each time you sign in we send a fresh 6-digit code to your registered
        mobile number.
      </div>
    </div>
  );
}

function PageAccountPrivacy() {
  const [deleteConsent, setDeleteConsent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="p-5 sm:p-6">
      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <div className="p-7 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-500"><IcAlert /></div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete Account?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">This is permanent. All your data, orders, and preferences will be removed and cannot be recovered.</p>
            <div className="flex gap-3">
              <GhostBtn onClick={() => { setShowConfirm(false); setDeleteConsent(false); }} className="flex-1">Cancel</GhostBtn>
              <button className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all cursor-pointer">Delete Forever</button>
            </div>
          </div>
        </Modal>
      )}
      <ChangePasswordBlock />
      <SectionTitle>Account Privacy</SectionTitle>
      <div className="text-sm text-slate-600 mb-5 space-y-3 leading-relaxed">
        <p>At Planext4u, we are committed to protecting the privacy and security of our users&apos; personal information.</p>
        <p>We collect information such as your name, email address, phone number, and payment details to facilitate transactions and provide our services.</p>
        <p>Your data is stored securely and never sold to third parties. You have the right to access, modify, or delete your personal information at any time.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 flex gap-3">
        <span className="text-amber-500 shrink-0 mt-0.5"><IcAlert /></span>
        <div>
          <p className="text-xs font-medium text-amber-800 mb-1">Account Deletion Warning</p>
          <p className="text-xs text-amber-700 leading-relaxed">Deleting your account permanently removes all data, orders, and preferences. This action cannot be undone.</p>
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer mb-5">
        <input type="checkbox" checked={deleteConsent} onChange={e => setDeleteConsent(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-red-500 shrink-0 cursor-pointer" />
        <span className="text-sm text-slate-600">I understand and wish to permanently delete my account and all associated data.</span>
      </label>
      {deleteConsent && (
        <button onClick={() => setShowConfirm(true)} className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all cursor-pointer">
          Delete My Account
        </button>
      )}
    </div>
  );
}
 
function PageLogout({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="p-5 sm:p-6 flex items-center justify-center min-h-72">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-sm border border-slate-100 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-500"><IcLogOutBig /></div>
        <h3 className="text-base font-semibold text-slate-800 mb-2">Leaving so soon?</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">You&apos;re about to end your session. Come back anytime!</p>
        <div className="flex gap-3">
          <GhostBtn onClick={onCancel} className="flex-1">Stay</GhostBtn>
          <PrimaryBtn className="flex-1">Log Out</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
 
function ProfileHeader({ avatarUrl, onAvatarChange }: { avatarUrl: string | null; onAvatarChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => onAvatarChange(ev.target?.result as string);
    reader.readAsDataURL(f); e.target.value = "";
  };
  return (
    <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100" style={{ background: "linear-gradient(to right,#f0fdf4,#f8fafc)" }}>
      <div className="flex items-center gap-3">
        <div className="relative cursor-pointer" onClick={() => ref.current?.click()}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-200" />
            : <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold ring-2 ring-emerald-200" style={{ background: PRIMARY_GRADIENT }}>P</div>}
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white" style={{ background: PRIMARY_SOLID }}>
            <IcCamera s={10} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Planext4u</p>
          <p className="text-xs text-slate-400">One App Infinite Solutions</p>
        </div>
      </div>
      <button onClick={() => ref.current?.click()} className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer">
        <IcCamera />
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
} 
function Sidebar({ active, setActive, onClose }: { active: ActivePage; setActive: (p: ActivePage) => void; onClose?: () => void }) {
  return (
    <div className="w-full bg-white flex flex-col min-h-full">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase">Your Account</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-1">
        {SIDEBAR_ITEMS.map(({ id, label, icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => { setActive(id); onClose?.(); }}
              className={`flex items-center justify-between w-full px-4 py-2.5 text-left text-xs transition-all border-none cursor-pointer ${!isActive ? "text-slate-600 hover:bg-slate-50" : "text-white"}`}
              style={isActive ? { background: PRIMARY_GRADIENT } : {}}>
              <span className="flex items-center gap-2.5">
                <span className={isActive ? "text-white" : "text-slate-400"}>{icon}</span>
                {label}
              </span>
              <span className={isActive ? "text-white/70" : "text-slate-300"}><IcChevronR /></span>
            </button>
          );
        })}
      </nav>
    </div>
  );
} 
export default function ProfilePages() {
  const [activePage, setActivePage] = useState<ActivePage>("profile");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); 
const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyHash = () => {
      const h = window.location.hash.replace(/^#/, "").toLowerCase();
      if (h === "my-bookings" || h === "bookings") setActivePage("my-bookings");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const renderPage = (): React.ReactNode => {
    switch (activePage) {
      case "profile": return <PageProfile />;
      case "saved-addresses": return <PageSavedAddresses />;
      case "select-language": return <PageSelectLanguage />;
      case "notification": return <PageNotification />;
      case "your-orders": return <PageYourOrders />;
      case "my-bookings": return <PageMyBookings />;
      case "reviews-ratings": return <PageReviews />;
      case "your-favourites": return <PageFavourites />;
      case "refer-earn": return <PageReferEarn />;
      case "reward-points": return <PageRewardPoints />;
      case "become-vendor": return <PageBecomeVendor />;
      case "account-privacy": return <PageAccountPrivacy />;
      case "logout": return <PageLogout onCancel={() => setActivePage("profile")} />;
      default: return <PageProfile />;
    }
  };

  const activeLabel = SIDEBAR_ITEMS.find(s => s.id === activePage)?.label || "Profile";
  return (
    <AuthGuard>
    <>
      <style>{`
        
        .hide-desktop { display: flex !important; }
        .show-desktop { display: none !important; }
        @media (min-width: 768px) {
          .hide-desktop { display: none !important; }
          .show-desktop { display: flex !important; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>

      <div className="min-h-screen bg-white flex flex-col">
    <header className="w-full shadow-sm">
  <div className="max-w-[1400px] mx-auto h-14 flex items-center justify-between px-4 sm:px-6"  style={{ background: PRIMARY_GRADIENT, position: 'sticky', top: 0, zIndex: 50 }}>
            <button className="hide-desktop w-8 h-8 rounded-xl bg-white/10 border border-white/20 items-center justify-center text-white cursor-pointer"
              onClick={() => setMobileOpen(true)}><IcMenu /></button>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/40" />
              : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">P</div>}
            <div>
              <p className="text-white text-sm font-medium">Planext4u</p>
              <p className="text-white/60 text-[10px]">One App Infinite Solutions</p>
            </div>
          </div> 
        </header>

        <div className="flex-1 bg-white">
          <div className="max-w-[1400px] mx-auto flex min-h-[calc(100vh-56px)]">
           <aside
  className="show-desktop w-[220px] shrink-0 bg-white border-r border-slate-100 sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto"
>
              <Sidebar active={activePage} setActive={setActivePage} />
            </aside>

            {mobileOpen && (
              <div className="fixed inset-0 z-[200] md:hidden flex">
                <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                <div className="relative w-56 bg-white h-full shadow-2xl overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-700">Menu</p>
                    <button onClick={() => setMobileOpen(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"><IcX /></button>
                  </div>
                  <Sidebar active={activePage} setActive={setActivePage} onClose={() => setMobileOpen(false)} />
                </div>
              </div>
            )}

            <main className="flex-1 min-w-0 bg-white overflow-y-auto h-[calc(100vh-56px)]">
              <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-5 flex gap-5 items-start">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden w-full">
                  <ProfileHeader avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} />
                  {renderPage()}
                </div>

              </div>
            </main>
          </div>
        </div>
      </div>
    </>
    </AuthGuard>
  );
}