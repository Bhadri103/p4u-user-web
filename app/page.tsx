"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeAlert,
  Briefcase,
  Home as HomeIcon,
  LifeBuoy,
  ShoppingBag,
  Tag,
  UsersRound,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import AuthModal from "@/components/auth/Authmodal";
import logo from "./icon.png";
import { profileApi } from "@/lib/api/profile";
import { avatarLetterFromDisplayName } from "@/lib/resolveCustomerId";
import { useAuth } from "@/providers/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isLoggedIn, isLoading, displayName, login } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const sections = [
    {
      title: "Shop",
      body: "Find everything you need",
      href: "/shop",
      icon: ShoppingBag,
    },
    {
      title: "Socio",
      body: "Connect with your community",
      href: "/socio",
      icon: UsersRound,
    },
    {
      title: "Services",
      body: "Book trusted services",
      href: "/service",
      icon: Briefcase,
    },
    {
      title: "Classifieds",
      body: "Buy, sell & discover near you",
      href: "/classified",
      icon: Tag,
    },
  ];

  const quickLinks = [
    { label: "Emergency", href: "/service?category=emergency", icon: BadgeAlert },
    { label: "Help", href: "/service?category=help", icon: LifeBuoy },
    { label: "Quick Assist", href: "/service?category=quick-assist", icon: Zap },
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      setWalletAmount(null);
      setProfileAvatar(null);
      return;
    }

    let cancelled = false;
    Promise.allSettled([
      profileApi.getWallet({ limit: 5, offset: 0 }),
      profileApi.getMe(),
    ]).then(([walletResult, profileResult]) => {
      if (cancelled) return;

      if (walletResult.status === "fulfilled") {
        const wallet = walletResult.value;
        setWalletAmount(Number(wallet.displayAmount ?? wallet.balance ?? 0));
      } else {
        setWalletAmount(null);
      }

      if (profileResult.status === "fulfilled") {
        setProfileAvatar(profileResult.value.avatar ?? null);
      } else {
        setProfileAvatar(null);
      }
    });

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
      router.push("/profile");
      return;
    }
    setIsAuthOpen(true);
  }

  function handleAccountClick() {
    if (isLoggedIn) {
      router.push("/profile");
      return;
    }
    setIsAuthOpen(true);
  }

  const walletLabel =
    isLoading || (isLoggedIn && walletAmount == null)
      ? "..."
      : `\u20B9${Math.max(0, Math.floor(walletAmount ?? 0)).toLocaleString("en-IN")}`;

  function AccountAvatar() {
    if (isLoading) return null;
    if (!isLoggedIn) return <User className="h-8 w-8" strokeWidth={2.2} />;
    if (profileAvatar) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profileAvatar}
          alt="Profile"
          className="h-full w-full rounded-full object-cover"
          onError={() => setProfileAvatar(null)}
        />
      );
    }
    return <span>{avatarLetterFromDisplayName(displayName)}</span>;
  }

  return (
    <main className="welcome-hub min-h-screen overflow-hidden text-[#06233a]">
      <div className="welcome-hub__shade" />
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 pb-4 pt-[50px] sm:max-w-[430px]">
        <div className="flex items-start justify-between px-1">
          <div className="h-[70px] w-[70px] overflow-hidden rounded-2xl border border-[#eed36a]/80 bg-[#0e6b76] p-1 shadow-[0_8px_22px_rgba(0,0,0,0.22)]">
            <Image src={logo} alt="P4U" className="h-full w-full object-contain" priority />
          </div>
          <button
            type="button"
            onClick={handleAccountClick}
            className="flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#0daea9] text-xl font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
            aria-label={isLoggedIn ? "Open profile" : "Login"}
          >
            <AccountAvatar />
          </button>
        </div>

        <div className="mt-5">
          <h1 className="text-[32px] font-bold leading-none text-white drop-shadow-md">Welcome!</h1>
          <p className="mt-2 text-[18px] font-medium leading-tight text-white drop-shadow-sm">
            Everything you need, in one place.
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-4">
          {sections.map(({ title, body, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="welcome-card group flex h-[236px] flex-col items-center justify-center rounded-[28px] px-5 text-center"
            >
              <span className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-white/85 text-white">
                <Icon className="h-9 w-9" strokeWidth={2} />
              </span>
              <span className="mt-3 text-[24px] font-bold leading-none tracking-normal text-[#06233a]">
                {title}
              </span>
              <span className="mt-3 min-h-[42px] max-w-[130px] text-[16px] font-normal leading-[1.15] text-[#06233a]">
                {body}
              </span>
              <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/20 text-[#009999] transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-6 w-6" />
              </span>
            </Link>
          ))}

          <Link
            href="/home"
            className="absolute left-1/2 top-1/2 z-20 flex h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[8px] border-white/55 bg-[#08aaa3] text-white shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_12px_24px_rgba(0,0,0,0.24)]"
            aria-label="Open home page"
          >
            <HomeIcon className="h-9 w-9" strokeWidth={2.4} />
            <span className="mt-1 text-[14px] font-black">Home</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={handleWalletClick}
          className="welcome-wallet mt-4 flex min-h-[118px] items-center gap-4 rounded-[26px] border-2 border-white px-5 py-4 text-[#06233a]"
        >
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#0daea9] text-white shadow-sm">
            <Wallet className="h-9 w-9" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[24px] font-bold leading-none">Wallet</span>
            <span className="mt-2 block max-w-[170px] text-[16px] font-normal leading-[1.15]">
              {isLoggedIn ? "Secure payments made easy" : "Login to view balance"}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-5">
            <span className="rounded-full border border-white/75 bg-white/20 px-3 py-1 text-[18px] font-bold text-[#009999]">
              {walletLabel}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/20 text-[#009999]">
              <ArrowRight className="h-5 w-5" />
            </span>
          </span>
        </button>

        <div className="mt-5 grid grid-cols-3 gap-5 px-5">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex flex-col items-center text-center">
              <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white/50 bg-[#0daea9] text-white shadow-[0_7px_18px_rgba(0,0,0,0.18)]">
                <Icon className="h-9 w-9" />
              </span>
              <span className="mt-2 whitespace-nowrap text-[15px] font-bold leading-none">
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
