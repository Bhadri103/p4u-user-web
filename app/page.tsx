"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import AuthModal from "@/components/auth/Authmodal";
import logo from "./icon.png";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, isLoading, login } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const sections = [
    {
      title: "Shop",
      body: "Find everything you need",
      href: "/shop",
      image: "/images/navigation/shop-nav.png",
      accent: "#B8E3F7",
      soft: "#EAF4FF",
    },
    {
      title: "Socio",
      body: "Connect with your community",
      href: "/socio",
      image: "/images/navigation/socio-nav.png",
      accent: "#89CFF0",
      soft: "#EAF4FF",
    },
    {
      title: "Services",
      body: "Book trusted services",
      href: "/service",
      image: "/images/navigation/services-nav.png",
      accent: "#89CFF0",
      soft: "#D8ECFF",
    },
    {
      title: "Find Home",
      body: "Discover verified homes near you",
      href: "/find-home",
      image: "/images/navigation/find-home-nav-v2.png",
      accent: "#B8E3F7",
      soft: "#F7FBFF",
    },
    {
      title: "Classifieds",
      body: "Buy, sell & discover near you",
      href: "/classified",
      image: "/images/navigation/classified-nav.png",
      accent: "#89CFF0",
      soft: "#EAF4FF",
    },
  ];

  const quickLinks = [
    { label: "Emergency", href: "/service?category=emergency", image: "/images/navigation/emergency-hub.png" },
    { label: "Help", href: "/service?category=help", image: "/images/navigation/help-hub.png" },
    { label: "Quick Assist", href: "/service?category=quick-assist", image: "/images/navigation/quick-assist-hub.png" },
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      setWalletAmount(null);
      setWalletLoading(false);
      return;
    }

    let cancelled = false;
    setWalletLoading(true);

    async function loadWallet() {
      try {
        const wallet = await profileApi.getWallet({ limit: 5, offset: 0 });
        if (!cancelled) setWalletAmount(Number(wallet.displayAmount ?? wallet.balance ?? 0));
      } catch {
        try {
          const rewards = await profileApi.getRewardPoints();
          if (!cancelled) setWalletAmount(Number(rewards.balance ?? 0));
        } catch {
          if (!cancelled) setWalletAmount(0);
        }
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    }

    loadWallet();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);


  function handleAuthSuccess(phone: string) {
    login(phone);
    setIsAuthOpen(false);
  }

  function handleWalletClick() {
    if (isLoggedIn) {
      router.push("/wallet");
      return;
    }
    setIsAuthOpen(true);
  }

  const walletLabel =
    isLoading || walletLoading
      ? "..."
      : isLoggedIn
        ? `\u20B9${Math.max(0, Math.floor(walletAmount ?? 0)).toLocaleString("en-IN")}`
        : "";

  return (
    <main className="welcome-hub min-h-dvh overflow-hidden text-[#202124]">
      <div className="welcome-hub__shade" />
      <div className="welcome-orb welcome-orb--one" />
      <div className="welcome-orb welcome-orb--two" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-4 pb-8 pt-10 min-[390px]:px-5 min-[390px]:pt-14 sm:max-w-[880px] sm:px-8 lg:max-w-[1180px] lg:px-10 lg:pt-12">
        <div className="welcome-intro">
          <div className="welcome-intro__brand">
            <Link href="/home" className="welcome-intro__logo" aria-label="Open Planext4u home">
              <Image src={logo} alt="Planext4u" priority className="h-full w-full object-contain" />
            </Link>
            <div className="welcome-intro__copy">
              <span className="welcome-intro__eyebrow" aria-hidden="true">
                <i /><i /><i /><i />
              </span>
              <h1 className="text-[34px] font-semibold leading-none text-[#202124] min-[390px]:text-[38px]">Welcome!</h1>
              <p className="mt-3 text-[17px] font-medium leading-tight text-[#5D687A] min-[390px]:text-[19px]">
                Everything you need, in one place.
              </p>
            </div>
          </div>
          <div className="welcome-intro__icons" aria-hidden="true">
            {sections.map(({ title, image }, index) => (
              <span key={title} style={{ animationDelay: `${index * 180}ms` }}>
                <Image src={image} alt="" width={58} height={58} className="h-full w-full object-cover" />
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 min-[390px]:mt-7 min-[390px]:gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {sections.map(({ title, body, href, image, accent, soft }, index) => (
            <Link
              key={title}
              href={href}
              style={{ animationDelay: `${100 + index * 90}ms`, "--welcome-accent": accent, "--welcome-soft": soft } as CSSProperties}
              className={`welcome-card welcome-reveal group flex min-h-[220px] flex-col items-center justify-center rounded-[26px] px-4 py-5 text-center transition-all duration-300 min-[390px]:min-h-[236px] min-[390px]:rounded-[28px] min-[390px]:px-5 lg:min-h-[244px] ${index === sections.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <span className="welcome-card__art flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_25px_rgba(32,33,36,.12)] min-[390px]:h-[88px] min-[390px]:w-[88px]">
                <Image src={image} alt="" width={90} height={90} className="h-full w-full object-contain" />
              </span>
              <span className="mt-3 text-[22px] font-bold leading-none tracking-normal text-[#202124] min-[390px]:text-[24px]">
                {title}
              </span>
              <span className="mt-2 min-h-[38px] max-w-[130px] text-[15px] font-normal leading-[1.15] text-[#202124] min-[390px]:mt-3 min-[390px]:min-h-[42px] min-[390px]:text-[16px]">
                {body}
              </span>
              <span className="mt-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E2EA] bg-white text-[#5D687A] transition-transform group-hover:translate-x-1 min-[390px]:mt-4 min-[390px]:h-9 min-[390px]:w-9">
                <ArrowRight className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6" />
              </span>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={handleWalletClick}
          style={{ animationDelay: "480ms" }}
          className="welcome-wallet welcome-reveal mt-4 flex min-h-[104px] items-center gap-3 rounded-[24px] border-2 border-white px-4 py-4 text-[#202124] min-[390px]:min-h-[118px] min-[390px]:gap-4 min-[390px]:rounded-[26px] min-[390px]:px-5"
        >
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(32,33,36,.12)] min-[390px]:h-[82px] min-[390px]:w-[82px]">
            <Image src="/images/navigation/wallet-hub.png" alt="" width={82} height={82} className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[22px] font-bold leading-none min-[390px]:text-[24px]">Wallet</span>
            <span className="mt-2 block max-w-[160px] text-[14px] font-normal leading-[1.15] min-[390px]:max-w-[170px] min-[390px]:text-[16px]">
              {isLoggedIn ? "Secure payments made easy" : "Login to view balance"}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-4 min-[390px]:gap-5">
            {isLoggedIn && (
              <span className="min-w-[58px] rounded-full border border-[#CFE6D6] bg-[#F1F8F2] px-2.5 py-1 text-center text-[16px] font-semibold text-[#3F7D5A] min-[390px]:px-3 min-[390px]:text-[18px]">
                {walletLabel}
              </span>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D7E2EA] bg-white text-[#5D687A]">
              <ArrowRight className="h-5 w-5" />
            </span>
          </span>
        </button>

        <div className="mt-5 grid grid-cols-3 gap-3 px-2 min-[390px]:gap-5 min-[390px]:px-5">
          {quickLinks.map(({ label, href, image }, index) => (
            <Link key={label} href={href} style={{ animationDelay: `${580 + index * 90}ms` }} className="welcome-quick-link welcome-reveal flex flex-col items-center text-center">
              <span className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(32,33,36,.14)] min-[390px]:h-[82px] min-[390px]:w-[82px]">
                <Image src={image} alt="" width={82} height={82} className="h-full w-full object-cover" />
              </span>
              <span className="mt-2 whitespace-nowrap text-[13px] font-bold leading-none min-[390px]:text-[15px]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </main>
  );
}
