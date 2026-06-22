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
  Calendar, Navigation, Clock, Package, Heart, Gift, Crown,
  Store, Bell, LogOut, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import logo from "../../images/logo.png";
import Ind from "../../images/language/Ind.png";
import classified from "../../images/home-header-icons/classified.png";
import services from "../../images/home-header-icons/services.png";
import shop from "../../images/home-header-icons/shop.png";
import social from "../../images/home-header-icons/social.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { avatarLetterFromDisplayName } from "@/lib/resolveCustomerId";

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
    { image: shop,       label: "Shop",          href: "/shop"           },
    { image: services,   label: "Services",       href: "/service"        },
    { image: social,     label: "Socio",          href: "/socio"          },
    { icon: Calendar,    label: "Booking",        href: "/booking"        },
    { image: classified, label: "Classified Ads", href: "/classified" },
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
    { icon: Calendar, label: "My Bookings",   href: "/profile#my-bookings" },
    { icon: Package, label: "Orders",         href: "/orders"        },
    { icon: Heart,   label: `Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ""}`,   href: "/wishlist"      },
    { icon: Gift,    label: "Rewards",        href: "/rewards"       },
    { icon: Crown,   label: "Membership",     href: "/membership"    },
    { icon: Store,   label: "Seller Account", href: "/seller"        },
    { icon: Bell,    label: "Notification",   href: "/notifications" },
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

  function LoginAvatar() {
    const letter = avatarLetterFromDisplayName(displayName);
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: "#009999" }}
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
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl py-1 overflow-hidden"
          style={{ top: "72px", right: "16px", zIndex: 999999, minWidth: "200px" }}
        >
          {loginMenuItems.map(({ icon: Icon, label, href }) =>
            label === "Logout" ? (
              <button
                key={label}
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                <span>{label}</span>
              </button>
            ) : (
              <Link
                key={label}
                href={href}
                onClick={() => setIsLoginDropdownOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
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

      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-[1000] shadow-sm pointer-events-auto">
 
        <div className="hidden min-[1200px]:block">
          <div className="max-w-[1400px] mx-auto px-4 xl:px-6 py-3">
            <div className="flex items-center gap-1.5 xl:gap-3">

              <Link href="/" className="flex-shrink-0">
                <div className="w-16 h-16 xl:w-20 xl:h-20 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>

              <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-2.5 xl:px-4 py-2.5 w-36 xl:w-52 cursor-pointer hover:border-gray-400 transition-colors flex-shrink-0" onClick={() => setIsLocationModalOpen(true)}>
                <MapPin className="text-gray-500 w-4 xl:w-5 h-4 xl:h-5 flex-shrink-0" strokeWidth={2} />
                <span className="text-gray-600 text-xs xl:text-sm truncate">JJ Nagar, Coimbator...</span>
              </div>

              <div className="flex-1 min-w-0 relative" ref={searchRef}>
                <div className="flex items-center gap-2 xl:gap-3 bg-white border border-gray-300 rounded-xl px-3 xl:px-4 py-2.5 hover:border-gray-400 transition-colors" style={isSearchOpen ? { borderColor: "#9ca3af", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}>
                  <Search className="text-gray-500 w-4 xl:w-5 h-4 xl:h-5 flex-shrink-0" strokeWidth={2} />
                  <input type="text" placeholder="Search for products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setIsSearchOpen(true)} className="bg-transparent outline-none text-gray-700 flex-1 text-xs xl:text-sm placeholder:text-gray-500 w-full min-w-0" />
                  {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
                </div>
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-xl shadow-lg z-50">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Recent Search</span>
                      <button className="text-xs font-medium text-gray-500 hover:text-gray-700" onClick={() => setIsSearchOpen(false)}>Clear all</button>
                    </div>
                    <ul className="pb-2">
                      {recentSearches.map((item, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group">
                          <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">{item}</span></div>
                          <button className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button className="bg-white border border-gray-300 text-black px-3 xl:px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap text-xs xl:text-sm flex-shrink-0">
                Become a Seller
              </button>

              <div className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0">
                <div className="w-5 xl:w-6 h-3 xl:h-4 relative"><Image src={Ind} alt="India Flag" fill className="object-contain rounded-sm" /></div>
                <span className="text-xs xl:text-sm text-black">ENG</span>
                <ChevronDown className="w-3 xl:w-4 h-3 xl:h-4 text-black" strokeWidth={2} />
              </div>
 
              <div
                id="login-btn"
                className="relative flex-shrink-0 flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onClick={handleLoginClick}
              >
                {isLoading ? (
                  <User className="w-4 xl:w-5 h-4 xl:h-5 text-black animate-pulse" strokeWidth={2} />
                ) : isLoggedIn ? (
                  <>
                    <LoginAvatar />
                    <span className="text-xs xl:text-sm text-black hidden xl:inline max-w-[160px] truncate" title={displayName}>
                      {displayName}
                    </span>
                    <ChevronDown className="w-3 xl:w-4 h-3 xl:h-4 text-black transition-transform" strokeWidth={2} style={{ transform: isLoginDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </>
                ) : (
                  <>
                    <User className="w-4 xl:w-5 h-4 xl:h-5 text-black" strokeWidth={2} />
                    <span className="text-xs xl:text-sm text-black">Login</span>
                  </>
                )}
              </div>
 
              <div onClick={e => { e.preventDefault(); e.stopPropagation(); handleCartClick(); }} className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors relative flex-shrink-0">
                <div className="relative">
                  <ShoppingCart className="w-4 xl:w-5 h-4 xl:h-5 text-black" strokeWidth={2} />
                  <CartBadge size="lg" />
                </div>
                <span className="text-xs xl:text-sm text-black">Cart</span>
              </div>
            </div>
          </div>
        </div>
 
        <div className="hidden md:block min-[1200px]:hidden">
          <div className="px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <div className="flex-[8] mx-1 relative" ref={searchRef}>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 hover:border-gray-400 transition-colors">
                  <Search className="text-gray-500 w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <input type="text" placeholder="Search products, sellers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setIsSearchOpen(true)} className="bg-transparent outline-none text-gray-700 flex-1 text-sm placeholder:text-gray-500 w-full" />
                </div>
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-xl shadow-lg z-50">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Recent Search</span>
                      <button className="text-xs text-blue-500 hover:text-blue-700 font-medium">Clear all</button>
                    </div>
                    <ul className="pb-2">
                      {recentSearches.map((item, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group">
                          <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">{item}</span></div>
                          <button className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div id="login-btn" className="flex items-center px-2.5 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors" onClick={handleLoginClick}>
                  {isLoggedIn ? <LoginAvatar /> : <User className="w-5 h-5 text-black" strokeWidth={2} />}
                </div>
                <div onClick={e => { e.preventDefault(); e.stopPropagation(); handleCartClick(); }} className="flex items-center px-2.5 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors relative">
                  <div className="relative"><ShoppingCart className="w-5 h-5 text-black" strokeWidth={2} /><CartBadge size="lg" /></div>
                </div>
                <button className="p-2.5 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5 text-black" strokeWidth={2} /> : <Menu className="w-5 h-5 text-black" strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="absolute left-0 right-0 bg-white border-t border-b border-gray-200 shadow-lg z-40">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button className="text-left text-sm w-full py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 flex items-center justify-between">Become a Seller</button>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-6 h-4 relative"><Image src={Ind} alt="India Flag" fill className="object-contain rounded-sm" /></div>
                  <span className="text-sm text-black">ENG</span>
                  <ChevronDown className="w-4 h-4 text-black" strokeWidth={2} />
                </div>
                <button className="text-left text-sm w-full py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 flex items-center justify-between" onClick={() => setIsLocationModalOpen(true)}>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-600" strokeWidth={2} /><span>JJ Nagar, Coimbatore...</span></div>
                  <ChevronRight className="w-4 h-4 text-black" strokeWidth={2} />
                </button>
              </nav>
            </div>
          )}
        </div>
 
        <div className="block md:hidden">
          <div className="px-3 sm:px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center relative overflow-hidden">
                  <Image src={logo} alt="P4U" fill className="object-contain p-2" priority />
                </div>
              </Link>
              <div className="flex items-center px-2.5 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsLocationModalOpen(true)}>
                <MapPin className="w-5 h-5 text-gray-600" strokeWidth={2} />
              </div>
              <div className="flex-[8] mx-1 relative" ref={searchRef}>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 hover:border-gray-400 transition-colors">
                  <Search className="text-gray-500 w-4 h-4 flex-shrink-0" strokeWidth={2} />
                  <input type="text" placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setIsSearchOpen(true)} className="bg-transparent outline-none text-gray-700 flex-1 text-sm placeholder:text-gray-500 w-full" />
                </div>
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-xl shadow-lg z-50">
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Recent Search</span>
                      <button className="text-xs text-blue-500 font-medium">Clear all</button>
                    </div>
                    <ul className="pb-2">
                      {recentSearches.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div id="login-btn" className="flex items-center px-2.5 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors" onClick={handleLoginClick}>
                  {isLoggedIn ? <LoginAvatar /> : <User className="w-5 h-5 text-black" strokeWidth={2} />}
                </div>
                <div onClick={e => { e.preventDefault(); e.stopPropagation(); handleCartClick(); }} className="flex items-center px-2.5 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors relative">
                  <div className="relative"><ShoppingCart className="w-5 h-5 text-black" strokeWidth={2} /><CartBadge size="lg" /></div>
                </div>
                <button className="p-2.5 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5 text-black" strokeWidth={2} /> : <Menu className="w-5 h-5 text-black" strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="absolute left-0 right-0 bg-white border-t border-b border-gray-200 shadow-lg z-40">
              <nav className="flex flex-col px-4 py-3 space-y-2">
                <button className="text-left text-sm w-full py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 flex items-center justify-between">Become a Seller</button>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-6 h-4 relative"><Image src={Ind} alt="India Flag" fill className="object-contain rounded-sm" /></div>
                  <span className="text-sm text-black">ENG</span>
                  <ChevronDown className="w-4 h-4 text-black" strokeWidth={2} />
                </div>
                <button
                  className="text-left text-sm w-full py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 flex items-center justify-between"
                  onClick={() => { setIsMobileMenuOpen(false); if (isLoggedIn) { setIsLoginDropdownOpen(true); } else { setIsAuthOpen(true); } }}
                >
                  <div className="flex items-center gap-2">
                    {isLoggedIn ? (
                      <><LoginAvatar /><span className="truncate max-w-[160px] text-left" title={displayName}>{displayName}</span></>
                    ) : (
                      <><User className="w-4 h-4 text-black" strokeWidth={2} /><span>Login / Sign Up</span></>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-black" strokeWidth={2} />
                </button>
              </nav>
            </div>
          )}
        </div>
 
<nav className="w-full relative z-[1001] pointer-events-auto" style={{ background: "#E8F6F6" }}>
          <div className="max-w-[1400px] mx-auto px-4 xl:px-6">
            <div className="hidden min-[1200px]:block py-3">
              <div className="flex justify-between gap-4">
                {navItems.map(({ image, icon: Icon, label, href }) => {
                  const active = isActive(href);
                  return (
                    <Link key={label} href={href}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-200"
                    style={{
backgroundColor: active ? "#009999" : "#ffffff",
  border: "none",
  color: "#009999"
}}
                      >
                      {image ? <div className="w-5 h-5 relative flex-shrink-0"><Image src={image} alt={label} fill className="object-contain" /></div> : Icon &&<Icon className="w-5 h-5 flex-shrink-0" style={{ color: active ? "#ffffff" : "#009999" }}/>}
              <span className="font-medium text-base" style={{ color: active ? "#ffffff" : "#009999" }}>
  {label}
</span>
                      {active && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white inline-block" />}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="min-[1200px]:hidden py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              <div className="flex gap-3 px-2">
                {navItems.map(({ image, icon: Icon, label, href }) => {
                  const active = isActive(href);
                  return (
                    <Link key={label} href={href}
                      className="flex items-center justify-center gap-2 px-5 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-all duration-200"
                      style={{ border: active ? "1.5px solid #ffffff" : "1.5px solid rgba(255,255,255,0.45)", backgroundColor: active ? "rgba(255,255,255,0.15)" : "transparent" }}
                     onMouseEnter={(e) => {
  if (!active) e.currentTarget.style.backgroundColor = "#E8F6F6";
}}
onMouseLeave={(e) => {
  if (!active) e.currentTarget.style.backgroundColor = "#ffffff";
}}    >
                      {image ? <div className="w-4 h-4 relative flex-shrink-0"><Image src={image} alt={label} fill className="object-contain" /></div> : Icon && <Icon className="w-4 h-4 flex-shrink-0 text-white" strokeWidth={1.5} />}
                      <span className="font-medium text-sm text-white">{label}</span>
                      {active && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white inline-block" />}
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