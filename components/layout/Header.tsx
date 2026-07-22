"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useCart } from "@/providers/CartContext";
import { takePostLoginAction } from "@/lib/postLoginAction";
import { useAuth } from "@/providers/AuthContext";
import { profileApi } from "@/lib/api/profile";
import AuthModal from "@/components/auth/Authmodal";
import {
  MapPin, Search, ShoppingCart, User, ChevronDown, Menu, X,
  Navigation, Clock, Package, Heart, Gift,
  Store, LogOut, Wallet, Shield, ChevronRight,
  ShoppingBag, Megaphone, Wrench, Building2, Newspaper, UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import logo from "../../images/logo.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { avatarLetterFromDisplayName } from "@/lib/resolveCustomerId";

const HEADER_TEAL = "#0a9a9a";
const SELLER_ORANGE = "#f5a623";

interface HeaderProps {
  onCartOpen?: () => void;
}

export default function Header({ onCartOpen }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [locationSearch, setLocationSearch] = useState("");
  const { isLoggedIn, loggedPhone, displayName, isLoading, login, logout: authLogout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { totalItems, addToCart } = useCart();

  const navItems = [
    { icon: ShoppingBag, label: "Shop", href: "/shop" },
    { icon: Megaphone, label: "Socio", href: "/socio" },
    { icon: Wrench, label: "Services", href: "/service" },
    { icon: Building2, label: "Find Home", href: "/find-home", soon: true },
    { icon: Newspaper, label: "Classified Ads", href: "/classified" },
    { icon: UtensilsCrossed, label: "Food", href: "/food" },
  ];

  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/") === true;

  const recentSearches = ["Mobiles", "Laptops", "Headphones", "Watches", "Tablets"];

  const savedAddresses = [
    {
      tag: "P4U", tagType: "home",
      address: "SF NO.250/2 JJ NAGAR,SITE NO.15, NAGAHAMANCKEN PALAYAM ROAD, PATTANAM POST - COIMBATORE - 641016",
    },
    {
      tag: "P4U", tagType: "home",
      address: "SF NO.250/2 JJ NAGAR,SITE NO.15, NAGAHAMANCKEN PALAYAM ROAD, PATTANAM POST - COIMBATORE - 641016",
    },
  ];

  const loginMenuItems = [
    { icon: User,    label: "My Profile",     href: "/profile"       },
    { icon: Package, label: "Orders",         href: "/orders"        },
    { icon: Heart,   label: `Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ""}`,   href: "/wishlist"      },
    { icon: Wallet,  label: "Wallet",         href: "/wallet" },
    { icon: Gift,    label: "Referrals",      href: "/referrals" },
    { icon: Shield,  label: "KYC",            href: "/kyc-verification" },
    { icon: Store,   label: "Seller Account", href: "/seller"        },
    { icon: LogOut,  label: "Logout",         href: "/"              },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      const dropdown = document.getElementById("login-dropdown");
      const loginBtn = document.getElementById("login-btn");
      if (
        dropdown && !dropdown.contains(target) &&
        loginBtn && !loginBtn.contains(target)
      ) {
        setIsLoginDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function openAuthFromApp() {
      setIsAuthOpen(true);
    }
    window.addEventListener("p4u-open-auth", openAuthFromApp);
    return () => window.removeEventListener("p4u-open-auth", openAuthFromApp);
  }, []);

  /** `/register` redirects here with `?needsOtp=1` so user can re-verify after registration JWT expiry. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("needsOtp") !== "1") return;
    setIsAuthOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("needsOtp");
    const qs = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
  }, [pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWishlistCount(0);
      return;
    }
    profileApi
      .getWishlist()
      .then((rows) => setWishlistCount(rows.length))
      .catch(() => setWishlistCount(0));
  }, [isLoggedIn]);

  function handleCartClick() {
    if (onCartOpen) {
      onCartOpen();
    } else {
      sessionStorage.setItem("openCart", "1");
      router.push("/cart");
    }
  }

  function goVendorRegister() {
    setIsMobileMenuOpen(false);
    router.push("/vendor-register");
  }

  function handleLoginClick() {
    if (isLoggedIn) {
      setIsLoginDropdownOpen(prev => !prev);
    } else {
      setIsAuthOpen(true);
    }
  }

  function handleAuthSuccess(phone: string) {
    login(phone);
    setIsAuthOpen(false);
    const pending = takePostLoginAction();
    if (pending?.type === "addToCart") {
      queueMicrotask(() => addToCart(pending.item));
      return;
    }
    if (pending?.type === "navigate") {
      router.push(pending.href);
      return;
    }
  }

  function handleLogout() {
    authLogout();
    setIsLoginDropdownOpen(false);
    router.push("/");
  }

  function CartBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
    if (totalItems <= 0) return null;
    const dim = size === "lg" ? "w-5 h-5" : "w-4 h-4";
    return (
      <div
        className={`absolute -top-2 -right-2 rounded-full ${dim} flex items-center justify-center`}
        style={{ backgroundColor: "#0E221F" }}
      >
        <span className="text-white text-xs font-bold">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      </div>
    );
  }

  function LoginAvatar({ compact = false }: { compact?: boolean }) {
    const letter = avatarLetterFromDisplayName(displayName);
    const dim = compact ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white/30`}
        style={{ background: "rgba(255,255,255,0.2)" }}
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <> 
      {isLoggedIn && isLoginDropdownOpen && (
        <div
          id="login-dropdown"
          className="fixed overflow-hidden rounded-[18px] border border-slate-100 bg-white py-1 shadow-[0_10px_28px_rgba(15,23,42,0.16)]"
          style={{ top: "64px", right: "16px", zIndex: 999999, width: "268px" }}
        >
          {loginMenuItems.map(({ icon: Icon, label, href }, index) =>
            label === "Logout" ? (
              <button
                key={label}
                onClick={handleLogout}
                className="flex w-full items-center gap-4 border-t border-slate-100 px-5 py-3.5 text-left text-[16px] font-normal text-red-500 transition-colors hover:bg-red-50"
              >
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ) : (
              <Link
                key={label}
                href={href}
                onClick={() => setIsLoginDropdownOpen(false)}
                className={`flex w-full items-center gap-4 px-5 py-3 text-[16px] font-normal text-slate-800 transition-colors hover:bg-slate-50 ${index === 5 ? "border-t border-slate-100" : ""}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-slate-800" strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            )
          )}
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-16"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="text-base font-semibold text-gray-900">Select Location</h2>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-gray-400">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="text" placeholder="Search an address" value={locationSearch} onChange={e => setLocationSearch(e.target.value)} className="outline-none text-sm text-gray-700 flex-1 placeholder:text-gray-400" autoFocus />
              </div>
            </div>
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#e8f5f1" }}>
                    <Navigation className="w-4 h-4" style={{ color: "#0E221F" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Use My Current Location</p>
                    <p className="text-xs text-gray-500 mt-0.5">Enable your current location for better services</p>
                  </div>
                </div>
                <button className="text-white text-xs font-medium px-3 py-1.5 flex-shrink-0" style={{ borderRadius: "6px", background: "linear-gradient(135deg, rgba(14,34,31,0.8) 0%, rgba(14,34,31,1) 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>Enable</button>
              </div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Saved Address</p>
              <div className="space-y-3">
                {savedAddresses.map((addr, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all" onClick={() => setIsLocationModalOpen(false)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: "#0E221F", color: "white" }}>{addr.tag}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>Home</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{addr.address}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="w-full sticky top-0 z-[1000] shadow-sm pointer-events-auto">

        {/* ── Row 1: Teal top bar (desktop) ── */}
        <div className="hidden min-[1200px]:block" style={{ backgroundColor: HEADER_TEAL }}>
          <div className="max-w-[1400px] mx-auto px-4 xl:px-6 py-2.5">
            <div className="flex items-center gap-3 xl:gap-4">

              <Link href="/" className="flex-shrink-0">
                <div className="w-16 h-16 xl:w-20 xl:h-20 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-[#7dd3a8] bg-[#7dd3a8]/20 px-3 xl:px-4 py-2 w-40 xl:w-52 flex-shrink-0 hover:bg-[#7dd3a8]/30 transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#fde047] flex-shrink-0" strokeWidth={2.2} fill="#fde047" />
                <span className="text-white text-xs xl:text-sm truncate font-medium">Asramam, Tamil ...</span>
              </button>

              <div className="flex-1 min-w-0 relative" ref={searchRef}>
                <div
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-colors"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    ...(isSearchOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
                  }}
                >
                  <Search className="text-white/80 w-5 h-5 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search for "Electronics"'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className="bg-transparent outline-none text-white flex-1 text-sm placeholder:text-white/70 w-full min-w-0"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")}>
                      <X className="w-4 h-4 text-white/70 hover:text-white" />
                    </button>
                  )}
                </div>
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-200 border-t-0 rounded-b-2xl shadow-lg z-50">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Recent Search</span>
                      <button type="button" className="text-xs font-medium text-gray-500 hover:text-gray-700" onClick={() => setIsSearchOpen(false)}>Clear all</button>
                    </div>
                    <ul className="pb-2">
                      {recentSearches.map((item, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group">
                          <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">{item}</span></div>
                          <button type="button" className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={goVendorRegister}
                className="rounded-full px-5 xl:px-6 py-2.5 text-sm font-bold text-black whitespace-nowrap flex-shrink-0 hover:brightness-105 transition-all"
                style={{ backgroundColor: SELLER_ORANGE }}
              >
                Become a Seller
              </button>

              <div
                id="login-btn"
                className="relative flex-shrink-0 flex items-center gap-2 cursor-pointer select-none text-white"
                onClick={handleLoginClick}
              >
                {isLoading ? (
                  <User className="w-5 h-5 animate-pulse" strokeWidth={2} />
                ) : isLoggedIn ? (
                  <>
                    <User className="w-5 h-5" strokeWidth={2} />
                    <span className="text-sm font-medium max-w-[140px] truncate" title={displayName}>
                      {displayName}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform"
                      strokeWidth={2.5}
                      style={{ transform: isLoginDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5" strokeWidth={2} />
                    <span className="text-sm font-medium">Login</span>
                    <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCartClick(); }}
                className="relative flex-shrink-0 p-1 text-white hover:opacity-90 transition-opacity"
                aria-label="Cart"
              >
                <ShoppingCart className="w-6 h-6" strokeWidth={2} />
                <CartBadge size="lg" />
              </button>
            </div>
          </div>
        </div>
 
        {/* ── Row 1: Teal top bar (tablet) ── */}
        <div className="hidden md:block min-[1200px]:hidden" style={{ backgroundColor: HEADER_TEAL }}>
          <div className="px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <div className="flex-[8] mx-1 relative" ref={searchRef}>
                <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                  <Search className="text-white/80 w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search for "Electronics"'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className="bg-transparent outline-none text-white flex-1 text-sm placeholder:text-white/70 w-full"
                  />
                </div>
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-200 border-t-0 rounded-b-2xl shadow-lg z-50">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Recent Search</span>
                      <button type="button" className="text-xs text-gray-500 font-medium">Clear all</button>
                    </div>
                    <ul className="pb-2">
                      {recentSearches.map((item, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group">
                          <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">{item}</span></div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 text-white">
                <div id="login-btn" className="flex items-center p-2 cursor-pointer" onClick={handleLoginClick}>
                  {isLoggedIn ? <LoginAvatar compact /> : <User className="w-5 h-5" strokeWidth={2} />}
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCartClick(); }} className="relative p-2">
                  <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                  <CartBadge size="lg" />
                </button>
                <button type="button" className="p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="bg-white border-t border-white/20 shadow-lg">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button
                  type="button"
                  onClick={goVendorRegister}
                  className="text-left text-sm w-full py-3 px-4 rounded-full font-bold text-black flex items-center justify-center"
                  style={{ backgroundColor: SELLER_ORANGE }}
                >
                  Become a Seller
                </button>
                <button type="button" className="text-left text-sm w-full py-3 px-4 rounded-xl border border-gray-200 flex items-center justify-between" onClick={() => setIsLocationModalOpen(true)}>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#0a9a9a]" strokeWidth={2} /><span>Asramam, Tamil ...</span></div>
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* ── Row 1: Teal top bar (mobile) ── */}
        <div className="block md:hidden" style={{ backgroundColor: HEADER_TEAL }}>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <button type="button" className="p-2 text-white" onClick={() => setIsLocationModalOpen(true)}>
                <MapPin className="w-5 h-5" strokeWidth={2} />
              </button>
              <div className="flex-[8] relative" ref={searchRef}>
                <div className="flex items-center gap-2 rounded-full px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                  <Search className="text-white/80 w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className="bg-transparent outline-none text-white flex-1 text-sm placeholder:text-white/70 w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0 text-white">
                <div id="login-btn" className="p-2 cursor-pointer" onClick={handleLoginClick}>
                  {isLoggedIn ? <LoginAvatar compact /> : <User className="w-5 h-5" strokeWidth={2} />}
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); handleCartClick(); }} className="relative p-2">
                  <ShoppingCart className="w-5 h-5" strokeWidth={2} />
                  <CartBadge size="lg" />
                </button>
                <button type="button" className="p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="bg-white border-t border-white/20 shadow-lg">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button
                  type="button"
                  onClick={goVendorRegister}
                  className="w-full py-3 px-4 rounded-full font-bold text-black text-sm"
                  style={{ backgroundColor: SELLER_ORANGE }}
                >
                  Become a Seller
                </button>
                <button
                  type="button"
                  className="text-left text-sm w-full py-3 px-4 rounded-xl border border-gray-200 flex items-center justify-between"
                  onClick={() => { setIsMobileMenuOpen(false); if (isLoggedIn) { setIsLoginDropdownOpen(true); } else { setIsAuthOpen(true); } }}
                >
                  <div className="flex items-center gap-2">
                    {isLoggedIn ? (
                      <><LoginAvatar compact /><span className="truncate max-w-[160px]">{displayName}</span></>
                    ) : (
                      <><User className="w-4 h-4" strokeWidth={2} /><span>Login / Sign Up</span></>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </nav>
            </div>
          )}
        </div>
 
        {/* ── Row 2: Category navigation (white) ── */}
        <nav className="w-full bg-white border-b border-gray-100 relative z-[1001] pointer-events-auto">
          <div className="max-w-[1400px] mx-auto px-4 xl:px-6">
            <div className="hidden min-[1200px]:block py-3">
              <div className="flex items-center justify-between gap-3">
                {navItems.map(({ icon: Icon, label, href, soon }) => {
                  const active = isActive(href);
                  if (soon) {
                    return (
                      <div
                        key={label}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap border border-[#0a9a9a] bg-white text-[#0a9a9a] cursor-default"
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                        <span className="font-medium text-base">{label}</span>
                        <span className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: SELLER_ORANGE }}>
                          Soon
                        </span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={label}
                      href={href}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 font-medium text-base"
                      style={
                        active
                          ? { backgroundColor: HEADER_TEAL, color: "#ffffff", border: `1.5px solid ${HEADER_TEAL}` }
                          : { backgroundColor: "#ffffff", color: HEADER_TEAL, border: `1.5px solid ${HEADER_TEAL}` }
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="min-[1200px]:hidden py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              <div className="flex gap-2.5 px-1">
                {navItems.map(({ icon: Icon, label, href, soon }) => {
                  const active = isActive(href);
                  if (soon) {
                    return (
                      <div
                        key={label}
                        className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 border border-[#0a9a9a] bg-white text-[#0a9a9a]"
                      >
                        <Icon className="w-4 h-4" strokeWidth={2} />
                        <span className="font-medium text-sm">{label}</span>
                        <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase text-white" style={{ backgroundColor: SELLER_ORANGE }}>Soon</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap flex-shrink-0 font-medium text-sm transition-all"
                      style={
                        active
                          ? { backgroundColor: HEADER_TEAL, color: "#fff", border: `1.5px solid ${HEADER_TEAL}` }
                          : { backgroundColor: "#fff", color: HEADER_TEAL, border: `1.5px solid ${HEADER_TEAL}` }
                      }
                    >
                      <Icon className="w-4 h-4" strokeWidth={2} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  );
}
