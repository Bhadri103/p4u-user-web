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
  const [walletLoading, setWalletLoading] = useState(false);
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
      setWalletLoading(false);
      setProfileAvatar(null);
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
    profileApi
      .getMe()
      .then((profile) => {
        if (!cancelled) setProfileAvatar(profile.avatar ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfileAvatar(null);
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
      router.push("/wallet");
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
    isLoading || walletLoading
      ? "..."
      : isLoggedIn
        ? `\u20B9${Math.max(0, Math.floor(walletAmount ?? 0)).toLocaleString("en-IN")}`
        : "";

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
    <main className="welcome-hub min-h-dvh overflow-hidden text-[#06233a]">
      <div className="welcome-hub__shade" />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-4 pb-4 pt-7 min-[390px]:px-5 min-[390px]:pt-[50px] sm:max-w-[430px]">
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

        <div className="relative mt-7 grid grid-cols-2 gap-3 min-[390px]:mt-8 min-[390px]:gap-4">
          {sections.map(({ title, body, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="welcome-card group flex h-[212px] flex-col items-center justify-center rounded-[26px] px-4 text-center min-[390px]:h-[236px] min-[390px]:rounded-[28px] min-[390px]:px-5"
            >
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-2 border-white/85 text-white min-[390px]:h-[78px] min-[390px]:w-[78px]">
                <Icon className="h-8 w-8 min-[390px]:h-9 min-[390px]:w-9" strokeWidth={2} />
              </span>
              <span className="mt-3 text-[22px] font-bold leading-none tracking-normal text-[#06233a] min-[390px]:text-[24px]">
                {title}
              </span>
              <span className="mt-2 min-h-[38px] max-w-[130px] text-[15px] font-normal leading-[1.15] text-[#06233a] min-[390px]:mt-3 min-[390px]:min-h-[42px] min-[390px]:text-[16px]">
                {body}
              </span>
              <span className="mt-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/20 text-[#009999] transition-transform group-hover:translate-x-1 min-[390px]:mt-4 min-[390px]:h-9 min-[390px]:w-9">
                <ArrowRight className="h-5 w-5 min-[390px]:h-6 min-[390px]:w-6" />
              </span>
            </Link>
          ))}

          <Link
            href="/home"
            className="absolute left-1/2 top-1/2 z-20 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[7px] border-white/55 bg-[#08aaa3] text-white shadow-[0_0_0_2px_rgba(255,255,255,0.55),0_12px_24px_rgba(0,0,0,0.24)] min-[390px]:h-[110px] min-[390px]:w-[110px] min-[390px]:border-[8px]"
            aria-label="Open home page"
          >
            <HomeIcon className="h-8 w-8 min-[390px]:h-9 min-[390px]:w-9" strokeWidth={2.4} />
            <span className="mt-1 text-[14px] font-black">Home</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={handleWalletClick}
          className="welcome-wallet mt-4 flex min-h-[104px] items-center gap-3 rounded-[24px] border-2 border-white px-4 py-4 text-[#06233a] min-[390px]:min-h-[118px] min-[390px]:gap-4 min-[390px]:rounded-[26px] min-[390px]:px-5"
        >
          <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-[#0daea9] text-white shadow-sm min-[390px]:h-[72px] min-[390px]:w-[72px]">
            <Wallet className="h-8 w-8 min-[390px]:h-9 min-[390px]:w-9" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[22px] font-bold leading-none min-[390px]:text-[24px]">Wallet</span>
            <span className="mt-2 block max-w-[160px] text-[14px] font-normal leading-[1.15] min-[390px]:max-w-[170px] min-[390px]:text-[16px]">
              {isLoggedIn ? "Secure payments made easy" : "Login to view balance"}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-4 min-[390px]:gap-5">
            {isLoggedIn && (
              <span className="min-w-[58px] rounded-full border border-white/75 bg-white/20 px-2.5 py-1 text-center text-[16px] font-bold text-[#009999] min-[390px]:px-3 min-[390px]:text-[18px]">
                {walletLabel}
              </span>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/20 text-[#009999]">
              <ArrowRight className="h-5 w-5" />
            </span>
          </span>
        </button>

        <div className="mt-5 grid grid-cols-3 gap-3 px-2 min-[390px]:gap-5 min-[390px]:px-5">
          {quickLinks.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="flex flex-col items-center text-center">
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-[4px] border-white/50 bg-[#0daea9] text-white shadow-[0_7px_18px_rgba(0,0,0,0.18)] min-[390px]:h-[76px] min-[390px]:w-[76px] min-[390px]:border-[5px]">
                <Icon className="h-8 w-8 min-[390px]:h-9 min-[390px]:w-9" />
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
