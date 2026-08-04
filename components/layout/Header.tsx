"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { useCart } from "@/providers/CartContext";
import { takePostLoginAction } from "@/lib/postLoginAction";
import { useAuth } from "@/providers/AuthContext";
import { profileApi } from "@/lib/api/profile";
import { formatAddress, formatAddressLabel, useAddresses } from "@/providers/AddressContext";
import AuthModal from "@/components/auth/Authmodal";
import {
  MapPin, Search, ShoppingCart, User, ChevronDown, Menu, X,
  Navigation, Clock, Package, Heart, Gift,
  Store, LogOut, Wallet, Shield, ChevronRight,
  ShoppingBag, Megaphone, Wrench, Building2, Newspaper, UtensilsCrossed, House,
} from "lucide-react";
import Image from "next/image";
import logo from "../../images/logo.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { avatarLetterFromDisplayName } from "@/lib/resolveCustomerId";
import { isFoodModuleEnabled } from "@/lib/features";
import { useLocale } from "@/providers/LocaleContext";

const HEADER_TEAL = "#EAF4FF";
const PRIMARY_ACTION_BLUE = "#1976D2";

interface HeaderProps {
  onCartOpen?: () => void;
  variant?: "default" | "marketplace";
}

type HeaderNavItem = {
  icon: typeof ShoppingBag;
  label: string;
  href: string;
  image?: string;
  accent: string;
  soft: string;
};

export default function Header({ onCartOpen, variant = "default" }: HeaderProps) {
  const { t } = useLocale();
  const isMarketplace = variant === "marketplace";
  const headerColor = HEADER_TEAL;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const { isLoggedIn, loggedPhone, displayName, isLoading, login, logout: authLogout } = useAuth();
  const {
    addresses,
    selectedAddress,
    selectedAddressId,
    isLoading: addressesLoading,
    error: addressError,
    selectAddress,
    refreshAddresses,
  } = useAddresses();
  const [searchQuery, setSearchQuery] = useState("");

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const tabletSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { totalItems, addToCart } = useCart();

  const navItems: HeaderNavItem[] = [
    { icon: House, label: "Home", href: "/home", image: "/images/navigation/home-hub.png", accent: "#8FB8DE", soft: "#F2F8FD" },
    { icon: ShoppingBag, label: "Shop", href: "/shop", image: "/images/navigation/shop-nav.png", accent: "#F2B93B", soft: "#FFF8E7" },
    { icon: Megaphone, label: "Socio", href: "/socio", image: "/images/navigation/socio-nav.png", accent: "#EF8A7E", soft: "#FFF1EF" },
    { icon: Wrench, label: "Services", href: "/service", image: "/images/navigation/services-nav.png", accent: "#7EB772", soft: "#F0F8ED" },
    { icon: Building2, label: "Find Home", href: "/find-home", image: "/images/navigation/find-home-nav-v2.png", accent: "#EDA96B", soft: "#FFF4EA" },
    { icon: Newspaper, label: "Classified Ads", href: "/classified", image: "/images/navigation/classified-nav.png", accent: "#E98B98", soft: "#FFF1F3" },
    ...(isFoodModuleEnabled
      ? [{ icon: UtensilsCrossed, label: "Food", href: "/food", accent: "#E9A23B", soft: "#FFF8E8" }]
      : []),
  ];
  const mobileDockItems: HeaderNavItem[] = navItems;

  const navStyle = (item: HeaderNavItem): CSSProperties => ({
    "--nav-accent": item.accent,
    "--nav-soft": item.soft,
  } as CSSProperties);
  const translatedNavLabel = (label: string) => ({
    Home: t("nav.home"), Shop: t("nav.shop"), Socio: t("nav.socio"), Services: t("nav.services"),
    "Find Home": t("nav.findHome"), "Classified Ads": t("nav.classified"),
  }[label] || label);

  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/") === true;

  const recentSearches = ["Mobiles", "Laptops", "Headphones", "Watches", "Tablets"];

  const selectedAddressText = addressesLoading
    ? "Loading address..."
    : selectedAddress
      ? formatAddressLabel(selectedAddress)
      : isLoggedIn
        ? "Set your address"
        : "Login to add address";
  const normalizedLocationSearch = locationSearch.trim().toLowerCase();
  const visibleAddresses = normalizedLocationSearch
    ? addresses.filter((address) =>
        [address.label, address.fullName, formatAddress(address)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedLocationSearch),
      )
    : addresses;

  const enableCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not supported by this browser.");
      return;
    }
    setLocationStatus("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        localStorage.setItem("p4u_customer_latitude", String(coords.latitude));
        localStorage.setItem("p4u_customer_longitude", String(coords.longitude));
        setLocationStatus("Current location enabled. Your selected saved address remains active.");
      },
      () => setLocationStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

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
      const clickedInsideSearch = [desktopSearchRef, tabletSearchRef, mobileSearchRef]
        .some((ref) => ref.current?.contains(target));
      if (!clickedInsideSearch) {
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
      setProfileAvatar(null);
      return;
    }
    const loadProfileChrome = () => {
      Promise.allSettled([profileApi.getWishlist(), profileApi.getMe()]).then(([wishlist, profile]) => {
        setWishlistCount(wishlist.status === "fulfilled" ? wishlist.value.length : 0);
        setProfileAvatar(profile.status === "fulfilled" ? profile.value.avatar ?? null : null);
      });
    };
    loadProfileChrome();
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar?: string | null }>).detail;
      if (detail && "avatar" in detail) {
        setProfileAvatar(detail.avatar ?? null);
        return;
      }
      loadProfileChrome();
    };
    window.addEventListener("p4u-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("p4u-profile-updated", onProfileUpdated);
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

  function runProductSearch(query = searchQuery) {
    const value = query.trim();
    if (!value) return;
    setSearchQuery(value);
    setIsSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(value)}`);
  }

  function SearchSuggestions() {
    return (
      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[1200] max-h-[360px] overflow-y-auto rounded-2xl border border-[#D7E7F5] bg-white p-2 shadow-[0_20px_50px_rgba(32,33,36,.2)]">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <span className="text-sm font-semibold text-[#202124]">Recent searches</span>
          <button
            type="button"
            className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}
          >
            Clear
          </button>
        </div>
        <ul className="space-y-0.5">
          {recentSearches.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => runProductSearch(item)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-[#F3F9FF] hover:text-[#202124]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EAF4FF]">
                  <Clock className="h-3.5 w-3.5 text-[#89CFF0]" />
                </span>
                <span>{item}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function CartBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
    if (totalItems <= 0) return null;
    const dim = size === "lg" ? "w-5 h-5" : "w-4 h-4";
    return (
      <div
        className={`cart-glow-badge absolute -top-2 -right-2 rounded-full ${dim} flex items-center justify-center border border-white bg-white shadow-lg`}
      >
        <span className="text-[#89CFF0] text-[10px] font-semibold">
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
        className={`${dim} overflow-hidden rounded-full flex items-center justify-center text-[#89CFF0] font-semibold flex-shrink-0 ring-2 ring-white shadow-sm`}
        style={{ background: "#EAF4FF" }}
        aria-label={`${displayName} profile picture`}
      >
        {profileAvatar
          ? <Image src={profileAvatar} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" />
          : letter}
      </div>
    );
  }

  return (
    <> 
      {isLoggedIn && isLoginDropdownOpen && (
        <div
          id="login-dropdown"
          className="fixed overflow-hidden rounded-[18px] border border-slate-100 bg-white py-1 shadow-[0_10px_28px_rgba(32,33,36,0.16)]"
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
                className={`flex w-full items-center gap-4 px-5 py-3 text-[16px] font-normal text-neutral-800 transition-colors hover:bg-slate-50 ${index === 5 ? "border-t border-slate-100" : ""}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-neutral-800" strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            )
          )}
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsLocationModalOpen(false)}
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
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
                    <Navigation className="w-4 h-4" style={{ color: "#202124" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Use My Current Location</p>
                    <p className="text-xs text-gray-500 mt-0.5">Enable your current location for better services</p>
                  </div>
                </div>
                <button type="button" onClick={enableCurrentLocation} className="text-white text-xs font-medium px-3 py-1.5 flex-shrink-0" style={{ borderRadius: "6px", background: "linear-gradient(135deg, rgba(14,34,31,0.8) 0%, rgba(14,34,31,1) 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>Enable</button>
              </div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Saved Address</p>
              {locationStatus && <p className="mb-3 text-xs text-gray-500" role="status">{locationStatus}</p>}
              {addressesLoading ? (
                <div className="rounded-lg border border-gray-200 px-3 py-5 text-center text-sm text-gray-500">Loading saved addresses...</div>
              ) : addressError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{addressError}</p>
                  <button type="button" onClick={() => void refreshAddresses()} className="mt-2 font-semibold underline">Try again</button>
                </div>
              ) : visibleAddresses.length ? (
                <div className="space-y-3">
                  {visibleAddresses.map((address) => {
                    const active = String(address.id) === selectedAddressId;
                    return (
                      <button
                        key={String(address.id)}
                        type="button"
                        className={`block w-full rounded-lg border p-3 text-left transition-all ${active ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                        onClick={() => {
                          selectAddress(address.id);
                          setIsLocationModalOpen(false);
                        }}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="rounded-full bg-[#EAF4FF] px-2 py-0.5 text-xs font-semibold text-[#202124]">P4U</span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{address.label || "Address"}</span>
                          {address.isDefault && <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Default</span>}
                          {active && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-teal-700">Selected</span>}
                        </div>
                        <p className="text-xs leading-relaxed text-gray-600">{formatAddress(address)}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500">
                  {normalizedLocationSearch ? "No saved address matches your search." : isLoggedIn ? "No saved addresses yet." : "Login to view and manage your saved addresses."}
                </div>
              )}
              {isLoggedIn && (
                <Link href="/saved-addresses" onClick={() => setIsLocationModalOpen(false)} className="mt-3 block text-center text-sm font-semibold text-teal-700 hover:text-teal-800">
                  Manage saved addresses
                </Link>
              )}            </div>
          </div>
        </div>
      )}

      <header className={`relative z-[40] w-full shrink-0 shadow-sm pointer-events-auto ${isMarketplace ? "marketplace-header" : ""}`}>

        {/* ── Row 1: Teal top bar (desktop) ── */}
        <div className="p4u-header-surface fixed inset-x-0 top-0 z-[40] hidden overflow-visible min-[1200px]:block" style={{ backgroundColor: headerColor }}>
          <div className="mx-auto w-full max-w-7xl px-4 py-2.5 xl:px-6">
            <div className="flex items-center gap-3 xl:gap-4">

              <Link href="/home" className="flex-shrink-0" aria-label="Planext4u home">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="p4u-address-button flex items-center gap-2 rounded-full border border-[#1976D2] bg-[#1976D2] px-3 xl:px-4 py-2 w-40 xl:w-52 flex-shrink-0 hover:bg-[#1565C0] transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#7A879B] flex-shrink-0" strokeWidth={2.2} />
                <span className="text-[#202124] text-xs xl:text-sm truncate font-medium" title={selectedAddress ? formatAddress(selectedAddress) : selectedAddressText}>{selectedAddressText}</span>
              </button>

              <div className="relative min-w-0 flex-1" ref={desktopSearchRef}>
                <div
                  className="flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white px-4 shadow-sm transition-colors"
                  style={{
                    ...(isSearchOpen ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
                  }}
                >
                  <Search className="h-5 w-5 flex-shrink-0 text-[#89CFF0]" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search for "Electronics"'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      runProductSearch();
                    }}
                    className="header-search-input min-w-0 w-full flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5D757A]"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")}>
                      <X className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                    </button>
                  )}
                </div>
                {isSearchOpen && <SearchSuggestions />}
              </div>

              <button
                type="button"
                onClick={goVendorRegister}
                className="seller-cta rounded-full px-5 xl:px-6 py-2.5 text-sm font-semibold text-white whitespace-nowrap flex-shrink-0 hover:brightness-105 transition-all"
                style={{ backgroundColor: PRIMARY_ACTION_BLUE }}
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
                    <LoginAvatar />
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
        <div className="p4u-header-surface fixed inset-x-0 top-0 z-[40] hidden overflow-visible md:block min-[1200px]:hidden" style={{ backgroundColor: headerColor }}>
          <div className="px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/home" className="flex-shrink-0" aria-label="Planext4u home">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <div className="relative mx-1 flex-[8]" ref={tabletSearchRef}>
                <div className="flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white px-3 shadow-sm">
                  <Search className="h-4 w-4 flex-shrink-0 text-[#89CFF0]" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search for "Electronics"'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Enter") runProductSearch(); }}
                    className="header-search-input w-full flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5D757A]"
                  />
                </div>
                {isSearchOpen && <SearchSuggestions />}
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
          <div className="px-3 pb-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="p4u-address-button flex w-full min-w-0 items-center gap-2 rounded-full border border-[#1976D2] bg-[#1976D2] px-3 py-2 text-left hover:bg-[#1565C0]"
              aria-label="Select delivery or service address"
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-[#7A879B]" strokeWidth={2.2} />
              <span className="truncate text-xs font-medium text-[#202124]" title={selectedAddress ? formatAddress(selectedAddress) : selectedAddressText}>{selectedAddressText}</span>
              <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-[#7A879B]" />
            </button>
          </div>
          {isMobileMenuOpen && (
            <div className="bg-white border-t border-white/20 shadow-lg">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button
                  type="button"
                  onClick={goVendorRegister}
                  className="seller-cta text-left text-sm w-full py-3 px-4 rounded-full font-semibold text-white flex items-center justify-center"
                  style={{ backgroundColor: PRIMARY_ACTION_BLUE }}
                >
                  Become a Seller
                </button>
                <button type="button" className="text-left text-sm w-full py-3 px-4 rounded-xl border border-gray-200 flex items-center justify-between" onClick={() => setIsLocationModalOpen(true)}>
                  <div className="flex min-w-0 items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0 text-[#89CFF0]" strokeWidth={2} /><span className="truncate">{selectedAddressText}</span></div>
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* ── Row 1: Teal top bar (mobile) ── */}
        <div className="p4u-header-surface fixed inset-x-0 top-0 z-[40] block overflow-visible md:hidden" style={{ backgroundColor: headerColor }}>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/home" className="flex-shrink-0" aria-label="Planext4u home">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <div className="relative flex-[8]" ref={mobileSearchRef}>
                <div className="flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white px-3 shadow-sm">
                  <Search className="h-4 w-4 flex-shrink-0 text-[#89CFF0]" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder='Search...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Enter") runProductSearch(); }}
                    className="header-search-input w-full flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5D757A]"
                  />
                </div>
                {isSearchOpen && <SearchSuggestions />}
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
          <div className="px-3 pb-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="p4u-address-button flex w-full min-w-0 items-center gap-2 rounded-full border border-[#1976D2] bg-[#1976D2] px-3 py-2 text-left hover:bg-[#1565C0]"
              aria-label="Select delivery or service address"
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-[#7A879B]" strokeWidth={2.2} />
              <span className="truncate text-xs font-medium text-[#202124]" title={selectedAddress ? formatAddress(selectedAddress) : selectedAddressText}>{selectedAddressText}</span>
              <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-[#7A879B]" />
            </button>
          </div>
          {isMobileMenuOpen && (
            <div className="bg-white border-t border-white/20 shadow-lg">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button
                  type="button"
                  onClick={goVendorRegister}
                  className="seller-cta w-full py-3 px-4 rounded-full font-semibold text-white text-sm"
                  style={{ backgroundColor: PRIMARY_ACTION_BLUE }}
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
 
        <div aria-hidden="true" className="h-[110px] md:h-[118px] min-[1200px]:h-[84px]" />

        {/* ── Row 2: Category navigation (white) ── */}
        <nav className="relative z-[1] hidden w-full border-b border-[#E5E7EB] bg-white pointer-events-auto md:block" aria-label="Primary navigation">
          <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-4 xl:px-6">
            <div
              className="grid w-full items-stretch gap-1.5 min-[900px]:gap-2.5 min-[1200px]:gap-3"
              style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
            >
              {navItems.map((item) => {
                const { icon: Icon, image, label, href } = item;
                const active = isActive(href);
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`p4u-nav-tile flex min-w-0 flex-col items-center justify-center gap-1.5 px-1 py-1.5 text-[10px] font-medium leading-none whitespace-nowrap transition-all duration-200 min-[900px]:px-2 min-[900px]:text-[11px] min-[1200px]:px-3 min-[1200px]:text-xs ${active ? "p4u-nav-active" : "p4u-nav-item"}`}
                    style={navStyle(item)}
                  >
                    {image ? (
                      <span className={`p4u-nav-artwork relative h-11 w-11 flex-shrink-0 rounded-xl min-[1200px]:h-[52px] min-[1200px]:w-[52px] min-[1200px]:rounded-2xl ${label === "Find Home" ? "p4u-find-home-artwork" : ""}`}>
                        <span className="p4u-nav-artwork-image flex h-full w-full items-center justify-center overflow-hidden rounded-xl min-[1200px]:rounded-2xl">
                          <Image src={image} alt="" width={52} height={52} className="h-full w-full object-contain" />
                        </span>
                      </span>
                    ) : (
                      <Icon className="h-5 w-5 flex-shrink-0 text-[#7A879B]" strokeWidth={2} />
                    )}
                    <span className="max-w-full truncate">{translatedNavLabel(label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <nav
          className="mobile-app-dock fixed inset-x-3 bottom-3 z-[1200] grid grid-cols-6 rounded-[22px] border border-[#D7E7F5] bg-white/95 p-1.5 shadow-[0_16px_45px_rgba(137,207,240,.2)] backdrop-blur-xl md:hidden"
          aria-label="Primary mobile navigation"
        >
          {mobileDockItems.slice(0, 6).map((item) => {
            const { icon: Icon, image, label, href } = item;
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={navStyle(item)}
                className={`p4u-mobile-nav-link flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[9px] font-semibold transition-all duration-300 ${
                  active
                    ? "is-active text-[#202124]"
                    : "text-[#7A879B] hover:bg-[#F3F9FF] hover:text-[#5D757A]"
                }`}
              >
                {image ? (
                  <span className="mb-1 h-7 w-7 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                    <Image src={image} alt="" width={28} height={28} className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <Icon className="mb-1 h-[18px] w-[18px] text-[#7A879B]" strokeWidth={2.1} />
                )}
                <span className="max-w-full truncate">{translatedNavLabel(label)}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  );
}
