"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin, Calendar, ChevronDown, Phone, MessageSquare,
  Star, Clock, ShieldCheck, Send, ChevronLeft,
  Check, Eye, ShoppingBag,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type BookingStep =
  | "landing"
  | "schedule"
  | "select_ride"
  | "connecting"
  | "driver_assigned"
  | "arrived";

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL         = "#009999";
const TEAL_DARK    = "#007777"; // slightly darker for hover / borders
const BTN_GRAD     = "#009999"; // removed gradient → plain color
const PLATFORM_FEE = 10;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Responsive Styles Injection ──────────────────────────────────────────────
const responsiveStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; }

  /* Desktop Classes */
  .hero-inputs {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 12px; background: white; padding: 16px; border-radius: 20px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;
    max-width: 860px; margin: 0 auto;
  }
  .tabs-wrapper {
    display: flex; gap: 4px; background: white; border-radius: 99px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;
    padding: 4px; overflow-x: auto; max-width: 100%;
  }
  .tabs-wrapper::-webkit-scrollbar { display: none; }
  
  .calendar-container {
    position: absolute; top: calc(100% + 4px); left: 0; z-index: 100;
    background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb; padding: 16px; min-width: 560px;
  }
  .calendar-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  }
  .schedule-layout {
    width: 100%; max-width: 900px; margin: 0 auto;
    display: flex; flex-direction: row; min-height: 100vh;
  }
  .schedule-sidebar {
    width: 320px; flex-shrink: 0; background: white; padding: 24px;
    display: flex; flex-direction: column; gap: 20px; border-right: 1px solid #e5e7eb;
  }
  .booking-layout {
    max-width: 1100px; margin: 0 auto; padding: 20px 16px 100px;
    display: flex; flex-direction: row; gap: 20px; align-items: flex-start;
  }
  .booking-left {
    flex: 1 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 16px;
  }
  .booking-right {
    flex: 0 0 380px; display: flex; flex-direction: column; gap: 16px;
  }
  .driver-assigned-card {
    display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px;
  }
  .car-details-border {
    flex: 1; min-width: 200px; border-left: 1px solid #f3f4f6; padding-left: 16px;
    display: flex; align-items: center; gap: 12px;
  }
  .action-buttons {
    display: flex; gap: 10px;
  }

  /* Mobile Classes */
  @media (max-width: 768px) {
    .hero-inputs { flex-direction: column; padding: 12px; border-radius: 16px; }
    .hero-inputs > div, .hero-inputs > button { width: 100%; }
    
    .calendar-container {
      min-width: unset; width: calc(100vw - 48px);
      left: 50%; transform: translateX(-50%);
    }
    .calendar-grid { grid-template-columns: 1fr; gap: 16px; }
    
    .schedule-layout { flex-direction: column; }
    .schedule-sidebar {
      width: 100%; border-right: none; border-bottom: 1px solid #e5e7eb; padding: 20px 16px;
    }
    
    .booking-layout { flex-direction: column; padding: 16px 16px 120px; }
    .booking-left, .booking-right { flex: 1 1 100%; width: 100%; }
    
    .driver-assigned-card { flex-direction: column; gap: 12px; }
    .car-details-border { border-left: none; padding-left: 0; border-top: 1px solid #f3f4f6; padding-top: 16px; }
    
    .action-buttons { flex-direction: column; }
    .action-buttons > button { width: 100%; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrimaryBtn({
  children, onClick, style = {}, disabled = false, className = "",
}: {
  children: React.ReactNode; onClick?: () => void;
  style?: React.CSSProperties; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} className={className}
      style={{
        background: BTN_GRAD, color: "white", border: "none",
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        fontWeight: 700, borderRadius: 10,
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.5 : 1, ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      onMouseDown={e  => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e    => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

// ─── Google Maps Embed ────────────────────────────────────────────────────────
function MapView({ showRoute = false }: { showRoute?: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 300, position: "relative", borderRadius: 16, overflow: "hidden" }}>
      <iframe
        title="map" width="100%" height="100%"
        style={{ border: 0, display: "block" }} loading="lazy"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62780.31153826636!2d79.82668674179688!3d11.930513600000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5361de07a6c679%3A0x9e0a1dce882af7bd!2sPuducherry%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
        allowFullScreen referrerPolicy="no-referrer-when-downgrade"
      />
      {showRoute && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
        }}>
          <svg width="100%" height="100%" style={{ position: "absolute" }}>
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill={TEAL} />
              </marker>
            </defs>
            <line x1="45%" y1="20%" x2="55%" y2="75%"
              stroke={TEAL} strokeWidth="3" strokeDasharray="6,4"
              markerEnd="url(#arrow)" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function CalendarPicker({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear,  setViewYear]  = useState(today.getFullYear());

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextYear  = viewMonth === 11 ? viewYear + 1 : viewYear;

  function daysInMonth(m: number, y: number) {
    return new Date(y, m + 1, 0).getDate();
  }
  function firstDay(m: number, y: number) {
    return new Date(y, m, 1).getDay();
  }

  function renderMonth(month: number, year: number) {
    const total = daysInMonth(month, year);
    const start = firstDay(month, year);
    const cells: (number | null)[] = Array(start).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{MONTHS[month]}</span>
          {month === viewMonth && (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                else setViewMonth(m => m - 1);
              }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280", padding: "2px 6px" }}>‹</button>
              <button onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                else setViewMonth(m => m + 1);
              }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b7280", padding: "2px 6px" }}>›</button>
            </div>
          )}
          {month !== viewMonth && <span style={{ fontSize: 11, color: "#9ca3af" }}>{year}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#9ca3af", fontWeight: 600, padding: "2px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dt = new Date(year, month, day);
            const isSelected = selectedDate.toDateString() === dt.toDateString();
            const isToday    = today.toDateString() === dt.toDateString();
            const isPast     = dt < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <button
                key={i}
                disabled={isPast}
                onClick={() => { onSelect(dt); onClose(); }}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none",
                  fontSize: 11, fontWeight: isSelected || isToday ? 700 : 400,
                  cursor: isPast ? "default" : "pointer",
                  background: isSelected ? TEAL : "transparent",
                  color: isPast ? "#d1d5db" : isSelected ? "white" : isToday ? TEAL : "#374151",
                  transition: "all 0.1s",
                  outline: isToday && !isSelected ? `2px solid ${TEAL}` : "none",
                  opacity: isPast ? 0.4 : 1,
                }}
              >{day}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSelect(today)} style={{ fontSize: 11, background: "#f3f4f6", border: "none", borderRadius: 99, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>Today</button>
        </div>
        <button onClick={() => {
          const c = new Date(today); onSelect(c); onClose();
        }} style={{ fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Clear ×</button>
      </div>
      <div className="calendar-grid">
        {renderMonth(viewMonth, viewYear)}
        {renderMonth(nextMonth, nextYear)}
      </div>
      <p style={{ fontSize: 10, color: TEAL, marginTop: 10, fontWeight: 600 }}>Reserve your ride up to 90 days in advance</p>
    </div>
  );
}

// ─── Driver Detail Modal ──────────────────────────────────────────────────────
function DriverModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 520, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
        </div>
        {/* Driver info */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <img src="https://i.pravatar.cc/100?img=11" style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${TEAL}` }} alt="driver" />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Joseph Vijay</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0" }}>Puducherry</p>
            <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={TEAL} color={TEAL} />)}
              <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 4 }}>(310+ Ratings & Reviews)</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0fdf4", border: `1px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Phone size={14} color={TEAL} />
            </button>
            <button style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0fdf4", border: `1px solid ${TEAL}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <MessageSquare size={14} color={TEAL} />
            </button>
          </div>
        </div>
        {/* Car */}
        <div style={{ display: "flex", gap: 16, padding: 12, background: "#f9fafb", borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🚗</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Car Details</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0" }}>Hyundai i20 Elite</p>
            <span style={{ fontSize: 12, fontWeight: 700, background: "#e5e7eb", padding: "2px 8px", borderRadius: 6 }}>TN 99 PU 9090</span>
          </div>
        </div>
        {/* Trip details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { label: "Pickup", val: "Auroville, Pondicherry - 605101" },
            { label: "Drop off", val: "Sedarapet, Puducherry - 605111" },
            { label: "Vehicle type", val: "Cab" },
            { label: "Ride Status", val: "Assigned" },
            { label: "Payment type", val: "Cash" },
            { label: "Fare", val: "₹ 279.89" },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
              <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "2px 0 0" }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Payment Panel (Sidebar-like) ─────────────────────────────────────────────
function PaymentSidebar({
  fare,
  onProceed,
}: { fare: number; onProceed: () => void }) {
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemApplied, setRedeemApplied] = useState(false);
  const [redeemAmt, setRedeemAmt] = useState(0);

  const total = fare + PLATFORM_FEE - (redeemApplied ? redeemAmt : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Redeem */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Redeem Points</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input value={redeemInput} onChange={e => setRedeemInput(e.target.value)}
            placeholder="Enter Points"
            style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 10px", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
          <PrimaryBtn onClick={() => {
            const p = parseInt(redeemInput) || 0;
            if (p > 0) { setRedeemAmt(p); setRedeemApplied(true); }
          }} style={{ padding: "7px 14px", fontSize: 12, borderRadius: 8, flexShrink: 0 }}>Apply</PrimaryBtn>
        </div>
        {redeemApplied
          ? <p style={{ fontSize: 10, color: "#059669", fontWeight: 600 }}>Applied: ₹{redeemAmt} off</p>
          : <p style={{ fontSize: 10, color: TEAL }}>You have 3104 reward points</p>
        }
      </div>
      {/* Summary */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Payment summary</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Total Fare",    val: `₹${fare.toFixed(2)}`,         color: "#374151" },
            { label: "Platform Fee",  val: `₹${PLATFORM_FEE}`,            color: "#374151" },
            ...(redeemApplied ? [{ label: "Redeem Points", val: `-₹${redeemAmt}`, color: "#059669" }] : []),
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: "1px dashed #e5e7eb", paddingBottom: 8, color: "#6b7280" }}>
              <span>{label}</span>
              <span style={{ fontWeight: 600, color }}>{val}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#111827" }}>
            <span>Total Amount</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
        <PrimaryBtn onClick={onProceed} style={{ width: "100%", marginTop: 14, padding: "11px 0", fontSize: 13, borderRadius: 10 }}>
          Proceed Payment
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─── Main Booking Component ───────────────────────────────────────────────────
export default function Booking() {
  const [activeTab, setActiveTab]     = useState("Taxi");
  const [step, setStep]               = useState<BookingStep>("landing");
  const [pickup, setPickup]           = useState("");
  const [drop, setDrop]               = useState("");
  const [showChat, setShowChat]       = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [rating, setRating]           = useState(0);
  const [chatMsg, setChatMsg]         = useState("");
  const [messages, setMessages]       = useState([
    { from: "driver", text: "Good Evening!", time: "8:29 pm" },
    { from: "driver", text: "I will arrive in 2 minutes.", time: "8:29 pm" },
    { from: "user",   text: "Okay", time: "8:30 pm" },
    { from: "driver", text: "Good Evening!", time: "8:31 pm" },
  ]);
  const [selectedVehicle, setSelectedVehicle] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [orderDone, setOrderDone]     = useState(false);

  // Schedule state
  const today = new Date();
  const [schedDate, setSchedDate]     = useState<Date>(today);
  const [schedTime, setSchedTime]     = useState("Now");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeDD, setShowTimeDD]   = useState(false);
  const calRef  = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (calRef.current  && !calRef.current.contains(e.target as Node))  setShowCalendar(false);
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setShowTimeDD(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const services = [
    { title: "Bike",        desc: "Quick rides for single person, best for traffic.",              img: "🏍️" },
    { title: "Cab",         desc: "Secure, comfortable rides with top-rated drivers.",             img: "🚗" },
    { title: "Auto",        desc: "Secure, comfortable rides with top-rated drivers.",             img: "🛺" },
    { title: "Parcel",      desc: "Secure, reliable local delivery within the city.",              img: "📦" },
    { title: "Outstation",  desc: "Inter-city travel with local & one-way fares.",                 img: "🚙" },
  ];

  const vehicles = [
    { type: "Bike",         time: "2 mins", desc: "Affordable, compact rides", price: 115.70, icon: "🏍️", seats: 1 },
    { type: "Auto",         time: "3 mins", desc: "Affordable, compact rides", price: 163.35, icon: "🛺", seats: 3 },
    { type: "Cab Comfort",  time: "5 mins", desc: "Affordable, compact rides", price: 242.30, icon: "🚗", seats: 4 },
    { type: "Cab Economy",  time: "4 mins", desc: "Comfortable rides",         price: 213.10, icon: "🚙", seats: 4 },
    { type: "Cab Premium",  time: "8 mins", desc: "Comfortable rides",         price: 531.33, icon: "🚘", seats: 4 },
    { type: "Parcel",       time: "10 mins",desc: "Send packages across town", price: 180.00, icon: "📦", seats: 0 },
  ];

  const selectedFare = vehicles[selectedVehicle]?.price ?? 279.89;

  function sendChat() {
    if (!chatMsg.trim()) return;
    setMessages(m => [...m, { from: "user", text: chatMsg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setChatMsg("");
  }

  function handleGetFare() {
    if (!pickup) setPickup("Pickup Location");
    if (!drop) setDrop("Drop Location");
    setStep("select_ride");
  }

  function handleBookRide() {
    setStep("connecting");
    setTimeout(() => setStep("driver_assigned"), 2500);
  }

  function handlePaymentDone() {
    setShowPayment(false);
    setOrderDone(true);
  }

  // ── Landing ────────────────────────────────────────────────────────────────
  const renderLanding = () => (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "white", minHeight: "100vh" }}>
      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 32, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}>
        <div className="tabs-wrapper">
          {["Taxi","Hotel","Mice/Events","Bus","Flights"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              background: activeTab === tab ? TEAL : "transparent",
              color: activeTab === tab ? "white" : "#6b7280",
              transition: "all 0.2s",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === "Taxi" ? (
        <>
          {/* Hero */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px 80px", textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: "#111827", marginBottom: 36, lineHeight: 1.2 }}>
              Driving people forward, shaping the world.
            </h1>
            <div className="hero-inputs">
              <div style={{ display: "flex", flex: 1, minWidth: 180, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", background: "#f9fafb" }}>
                <input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Pickup Location"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", width: "100%" }} />
                <MapPin size={16} color={TEAL} />
              </div>
              <div style={{ display: "flex", flex: 1, minWidth: 180, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 14px", background: "#f9fafb" }}>
                <input value={drop} onChange={e => setDrop(e.target.value)} placeholder="Drop location"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", width: "100%" }} />
                <MapPin size={16} color={TEAL} />
              </div>
              <PrimaryBtn onClick={handleGetFare} style={{ padding: "11px 28px", fontSize: 14, flexShrink: 0 }}>Get Fare</PrimaryBtn>
              <button onClick={() => setStep("schedule")} style={{
                padding: "11px 20px", fontSize: 14, fontWeight: 700, border: "1px solid #e5e7eb",
                borderRadius: 10, background: "white", cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
              }}>Schedule For Later</button>
            </div>
          </div>

          {/* Services Grid */}
          <div style={{ background: "#f9fafb", padding: "60px 16px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1f2937", marginBottom: 24 }}>Services Offer</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {services.map((s, i) => (
                  <div key={i} style={{
                    background: "white", padding: "20px 24px", borderRadius: 16,
                    border: "1px solid #f3f4f6", display: "flex", alignItems: "center",
                    justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    cursor: "pointer", transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"}
                  >
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>{s.title}</h3>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 12px", maxWidth: 160, lineHeight: 1.4 }}>{s.desc}</p>
                      <button style={{ fontSize: 11, fontWeight: 700, border: "1px solid #e5e7eb", borderRadius: 99, padding: "4px 14px", background: "white", cursor: "pointer", fontFamily: "inherit" }}>
                        Book Now
                      </button>
                    </div>
                    <div style={{ fontSize: 52 }}>{s.img}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Promo Banner */}
          <div style={{ background: TEAL_DARK, color: "white", padding: "48px 16px", textAlign: "center" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Request a ride for now or later</h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>Up to 50% off your first 3 rides. T&Cs apply.* *Valid within 15 days</p>
          </div>

          {/* Bottom section */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 16px", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Drive when you want, make what you need</h2>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 20 }}>
                Sign up to drive or deliver with P4U and earn on your schedule. No office. No boss. Just you and the road.
              </p>
              <button style={{ padding: "10px 24px", background: TEAL, color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Sign Up to Drive
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 260, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {["https://images.unsplash.com/photo-1606663920161-cbb9b1a7b9f0?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=300&h=200&fit=crop",
                "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&h=200&fit=crop",
              ].map((src, i) => (
                <img key={i} src={src} alt="drive" style={{ width: "calc(50% - 6px)", borderRadius: 12, objectFit: "cover", height: 110 }} />
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Coming Soon Placeholder for other tabs */
        <div style={{ padding: "100px 20px", textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
            {activeTab} Bookings
          </h2>
          <p style={{ fontSize: 16, color: "#6b7280" }}>
            We&apos;re currently building out the {activeTab.toLowerCase()} experience. Check back soon!
          </p>
        </div>
      )}
    </div>
  );

  // ── Schedule Step ──────────────────────────────────────────────────────────
  const renderSchedule = () => (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: "100vh", background: "#f9fafb" }}>
      <div className="schedule-layout">
        {/* Left panel */}
        <div className="schedule-sidebar">
          <button onClick={() => setStep("landing")} style={{ background: "none", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: "50%",  display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>When do you want to be picked up?</h2>

            {/* Date picker trigger */}
            <div ref={calRef} style={{ position: "relative", marginBottom: 12 }}>
              <button onClick={() => setShowCalendar(v => !v)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 12,
                background: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={15} color={TEAL} />
                  <span>{schedDate.toDateString() === today.toDateString() ? "Today" : schedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                <ChevronDown size={14} />
              </button>
              {showCalendar && (
                <CalendarPicker selectedDate={schedDate} onSelect={d => { setSchedDate(d); }} onClose={() => setShowCalendar(false)} />
              )}
            </div>

            {/* Time picker */}
            <div ref={timeRef} style={{ position: "relative", marginBottom: 20 }}>
              <button onClick={() => setShowTimeDD(v => !v)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 12,
                background: "white", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={15} color={TEAL} />
                  <span>{schedTime}</span>
                </div>
                <ChevronDown size={14} />
              </button>
              {showTimeDD && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 12, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                  {["Now","Morning 9-11 AM","Afternoon 12-3 PM","Evening 4-6 PM","Night 7-10 PM"].map(t => (
                    <button key={t} onClick={() => { setSchedTime(t); setShowTimeDD(false); }}
                      style={{ width: "100%", padding: "10px 14px", textAlign: "left", border: "none", background: schedTime === t ? "#f0fdf4" : "white", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: schedTime === t ? TEAL : "#374151", fontWeight: schedTime === t ? 700 : 400 }}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setStep("select_ride")} style={{
              width: "100%", padding: "13px 0", background: TEAL, color: "white",
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Next</button>

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Choose Your Pickup Time Up To 90 Days In Advance",
                "Extra Wait Time Included To Meet Your Ride",
                "Cancel At No Charge Up To 60 Minutes In Advance",
              ].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#6b7280" }}>
                  <span>•</span><span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 400 }}>
          <MapView />
        </div>
      </div>
      
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: 12,
        background: "white", borderTop: "1px solid #e5e7eb",
        display: "flex", justifyContent: "center", zIndex: 1000
      }}>
        <button onClick={() => setStep("select_ride")} style={{
          width: "100%", maxWidth: 720, padding: "14px 0", background: "#111827",
          color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>Book Ride</button>
      </div>
    </div>
  );

  // ── Booking Flow (select_ride / connecting / driver_assigned / arrived) ────
  const renderBookingFlow = () => {
    const isDriverStep = step === "driver_assigned";
    const isArrived    = step === "arrived";

    return (
      <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: "100vh", background: "#f9fafb" }}>
        <div className="booking-layout">
          {/* ── LEFT ── */}
          <div className="booking-left">

            {/* Get a Ride Card */}
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Get a Ride</h2>
              <div style={{ position: "relative", paddingLeft: 20, borderLeft: "2px dashed #d1d5db", marginLeft: 6, display: "flex", flexDirection: "column", gap: 10 }}>
                {[{ val: pickup || "Pickup Location", setter: setPickup, dot: TEAL },
                  { val: drop   || "Drop Location",   setter: setDrop,   dot: "#ef4444" }].map(({ val, setter, dot }, idx) => (
                  <div key={idx} style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: -27, top: 12, width: 10, height: 10, borderRadius: dot === TEAL ? "50%" : 0, background: dot }} />
                    <input value={val} onChange={e => setter(e.target.value)}
                      style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "10px 14px", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>
              {step === "select_ride" && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={handleGetFare} style={{ flex: 1, padding: "10px 0", background: TEAL, color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Get Fare</button>
                  <button onClick={() => setStep("schedule")} style={{ flex: 1, padding: "10px 0", background: "white", border: "1px solid #e5e7eb", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Schedule For Later</button>
                </div>
              )}
            </div>

            {/* Select Ride */}
            {step === "select_ride" && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                  Choose a Ride <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>(Rides we think you&apos;ll like)</span>
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginTop: 14 }}>
                  {vehicles.map((v, i) => (
                    <div key={i} onClick={() => setSelectedVehicle(i)}
                      style={{
                        padding: 12, borderRadius: 12, cursor: "pointer",
                        border: `1.5px solid ${i === selectedVehicle ? TEAL : "#e5e7eb"}`,
                        background: i === selectedVehicle ? "#f0fdf4" : "white",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.15s",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 28 }}>{v.icon}</div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>
                            {v.type}
                            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>
                              👤 {v.seats}
                            </span>
                          </p>
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{v.time} • {v.desc}</p>
                        </div>
                      </div>
                      <div style={{ background: TEAL, color: "white", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        ₹{v.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connecting */}
            {step === "connecting" && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 48, textAlign: "center" }}>
                <div style={{ width: 48, height: 48, border: `4px solid ${TEAL}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Connecting to your driver</h2>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Please wait while we find the nearest captain.</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "#9ca3af" }}>
                  <div style={{ width: 12, height: 12, border: `2px solid ${TEAL}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  searching for rides...
                </div>
              </div>
            )}

            {/* Driver Assigned */}
            {isDriverStep && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Tags */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "#374151", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>The driver will be on the way will arrive in 2mins</span>
                  <span style={{ background: "#374151", color: "white", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>OTP : 9898</span>
                </div>

                {/* Driver + Car card */}
                <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20 }}>
                  <div className="driver-assigned-card">
                    {/* Driver */}
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                        <img src="https://i.pravatar.cc/100?img=11" style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid #f3f4f6" }} alt="driver" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Joseph Vijay</p>
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0" }}>Total Rides: 3499 • With P4U: 1 year</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4 }}>
                            {[1,2,3,4,5].map(s => <Star key={s} size={10} fill="#f59e0b" color="#f59e0b" />)}
                            <span style={{ fontSize: 9, color: "#9ca3af", marginLeft: 4 }}>(310+ Ratings & Reviews)</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0fdf4", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <Phone size={13} color={TEAL} />
                          </button>
                          <button onClick={() => setShowChat(true)} style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0fdf4", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <MessageSquare size={13} color={TEAL} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, fontWeight: 600, color: "#374151", borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} color="#9ca3af" /> 21 km</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} color="#9ca3af" /> 8 min</span>
                        <span>₹ 279.89</span>
                      </div>
                    </div>

                    {/* Car */}
                    <div className="car-details-border">
                      <div style={{ width: 90, height: 60, background: "#f3f4f6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🚗</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Car Details</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0" }}>Hyundai i20 Elite</p>
                        <span style={{ fontSize: 12, fontWeight: 700, background: "#e5e7eb", padding: "2px 8px", borderRadius: 6 }}>TN 99 PU 9090</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pickup note */}
                <input placeholder="Any Pickup Note for Driver?" style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", fontSize: 13, outline: "none", fontFamily: "inherit", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }} />

                {/* Action buttons */}
                <div className="action-buttons">
                  <button onClick={() => setShowDriverModal(true)} style={{ flex: 1, padding: "14px 0", background: "#111827", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <MapPin size={14} /> Edit Destination
                  </button>
                  <button style={{ flex: 1, padding: "14px 0", background: "#f97316", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Cancel Ride
                  </button>
                </div>
              </div>
            )}

            {/* Arrived / Rating */}
            {isArrived && (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 32, textAlign: "center" }}>
                <div style={{ width: 64, height: 64, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <ShieldCheck size={30} color={TEAL} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Wow!</h2>
                <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>You have arrived at your destination</p>

                <div style={{ background: "#f9fafb", borderRadius: 16, padding: 20, maxWidth: 360, margin: "0 auto 24px", textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                    <img src="https://i.pravatar.cc/100?img=11" style={{ width: 40, height: 40, borderRadius: "50%" }} alt="driver" />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>Joseph Vijay</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Hyundai i20 Elite</p>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 10 }}>Rate Driver</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={28} onClick={() => setRating(s)}
                          fill={rating >= s ? "#f59e0b" : "transparent"}
                          color={rating >= s ? "#f59e0b" : "#d1d5db"}
                          style={{ cursor: "pointer", transition: "all 0.1s" }} />
                      ))}
                    </div>
                    <textarea placeholder="Leave a comment (Optional)" rows={2}
                      style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 12px", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                <button onClick={() => { setStep("landing"); setRating(0); }} style={{
                  width: "100%", maxWidth: 360, padding: "13px 0", background: TEAL, color: "white",
                  border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>Submit Rating & Finish</button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Map + Payment Sidebar ── */}
          <div className="booking-right">
            <div style={{ height: 320, borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <MapView showRoute={step !== "select_ride"} />
            </div>

            {/* Payment sidebar only in driver_assigned step */}
            {isDriverStep && (
              <PaymentSidebar fare={selectedFare} onProceed={() => setShowPayment(true)} />
            )}
          </div>
        </div>

        {/* ── Fixed Bottom: Book Ride ── */}
        {step === "select_ride" && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, padding: 12,
            background: "white", borderTop: "1px solid #e5e7eb",
            display: "flex", justifyContent: "center", zIndex: 1000
          }}>
            <button onClick={handleBookRide} style={{
              width: "100%", maxWidth: 720, padding: "15px 0", background: "#009999",
              color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "transform 0.1s",
            }}>Book Ride</button>
          </div>
        )}

     
        {/* {isDriverStep && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "white", borderTop: "1px solid #e5e7eb", zIndex: 40, display: "flex", justifyContent: "center" }}>
            <button onClick={() => setStep("arrived")} style={{
              width: "100%", maxWidth: 720, padding: "15px 0", background: "#111827",
              color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Payment</button>
          </div>
        )} */}

        {/* ── Chat Modal ── */}
        {showChat && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 380, height: 480, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Message</p>
                <button onClick={() => setShowChat(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 8, justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                      {m.from === "driver" && <img src="https://i.pravatar.cc/100?img=11" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} alt="" />}
                      <div style={{
                        maxWidth: "70%", padding: "8px 12px", borderRadius: m.from === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        background: m.from === "user" ? "white" : "#f3f4f6",
                        border: m.from === "user" ? `1px solid ${TEAL}` : "none",
                        fontSize: 13, color: "#374151",
                      }}>{m.text}</div>
                      {m.from === "user" && <img src="https://i.pravatar.cc/100?img=33" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} alt="" />}
                    </div>
                    <p style={{ fontSize: 9, color: "#9ca3af", margin: "3px 0 0", textAlign: m.from === "user" ? "right" : "left", paddingLeft: m.from === "driver" ? 36 : 0, paddingRight: m.from === "user" ? 36 : 0 }}>{m.time}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", gap: 8 }}>
                <input
                  value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Type Message..."
                  style={{ flex: 1, borderRadius: 99, border: "1px solid #e5e7eb", padding: "8px 14px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={sendChat} style={{ width: 36, height: 36, borderRadius: "50%", background: TEAL, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Send size={14} color="white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Driver Detail Modal ── */}
        {showDriverModal && <DriverModal onClose={() => setShowDriverModal(false)} />}

        {/* ── Payment Modal ── */}
        {showPayment && !orderDone && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Choose Payment</h3>
                <button onClick={() => setShowPayment(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af" }}>×</button>
              </div>
              {[
                { id: "card",  label: "Credit / Debit Card", icon: "💳" },
                { id: "upi",   label: "UPI (GPay, PhonePe, Paytm)", icon: "📱" },
                { id: "cash",  label: "Cash on Delivery", icon: "💵" },
              ].map(pm => (
                <div key={pm.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = TEAL}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"}
                >
                  <span style={{ fontSize: 20 }}>{pm.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{pm.label}</span>
                </div>
              ))}
              <PrimaryBtn onClick={handlePaymentDone} style={{ width: "100%", marginTop: 12, padding: "13px 0", fontSize: 14 }}>
                Pay ₹{(selectedFare + PLATFORM_FEE).toFixed(2)}
              </PrimaryBtn>
            </div>
          </div>
        )}

        {/* ── Order Success Modal ── */}
        {orderDone && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 400, padding: 40, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ width: 64, height: 64, background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `2px solid ${TEAL}` }}>
                <Check size={28} color={TEAL} strokeWidth={3} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Your home consultation ₹{(selectedFare + PLATFORM_FEE).toFixed(0)}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 28 }}>is successfully place</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => { setOrderDone(false); setStep("landing"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", border: "1px solid #e5e7eb", borderRadius: 10, background: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <ShoppingBag size={13} /> BACK TO HOME
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: TEAL, color: "white", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <Eye size={13} /> VIEW RIDE DETAILS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Router ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      {step === "landing" && renderLanding()}
      {step === "schedule" && renderSchedule()}
      {["select_ride", "connecting", "driver_assigned", "arrived"].includes(step) && renderBookingFlow()}
    </>
  );
}