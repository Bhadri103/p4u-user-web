"use client";

import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
} from "lucide-react";
import Image from "next/image";

import visaLogo from "../../images/payment-logos/img1.png";
import amexLogo from "../../images/payment-logos/img2.png";
import discoverLogo from "../../images/payment-logos/img3.png";
import mastercardLogo from "../../images/payment-logos/img4.png";
import maestroLogo from "../../images/payment-logos/img5.png";
import paypalLogo from "../../images/payment-logos/img6.png";

import appstore from "../../images/footer/appstore.png";
import footerLogo from "../../images/footer/footer-logo.png";
import googleplay from "../../images/footer/googleplay.png";

export default function Footer() {
  const infoLinks = [
    "SF NO 250/2 JJ NAGAR, SITE NO 15,",
    "NAGAMANAICKEN PALAYAM ROAD, PATTANAM POST -",
    "COIMBATORE 641016",
  ];

  const companyLinks = ["Contact Us", "Careers", "About Us", "Press"];
  const helpLinks = ["Payments", "Shipping", "Cancellation & Return", "FAQ"];
  const consumerPolicyLinks = [
    "Cancellation & Return",
    "Terms Of Use",
    "Security",
    "Privacy",
    "Sitemap",
    "Grievance Redressal",
    "EPR Compliance",
  ];

  const socialIcons = [
    { icon: Facebook, label: "Facebook" },
    { icon: Twitter, label: "Twitter" },
    { icon: Linkedin, label: "LinkedIn" },
    { icon: Instagram, label: "Instagram" },
    { icon: Youtube, label: "YouTube" },
  ];

  const paymentMethods = [
    { name: "VISA", logo: visaLogo },
    { name: "American Express", logo: amexLogo },
    { name: "Discover", logo: discoverLogo },
    { name: "Mastercard", logo: mastercardLogo },
    { name: "Maestro", logo: maestroLogo },
    { name: "PayPal", logo: paypalLogo },
  ];

  return (
    <>
      <footer className="site-footer mt-8 w-full border-t border-[#D7E7F5] bg-gradient-to-br from-[#F7FBFF] via-[#EAF4FF] to-[#D8ECFF] text-[#89CFF0]">
        <div className="mx-auto max-w-7xl    px-3 sm:px-4 md:px-6">
          <div className="px-1 pb-5 pt-8 sm:px-4 md:pt-10">
            <div className="mb-6 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-5 lg:gap-10">
              {/* Info */}
              <div>
                <h4 className="mb-3 font-semibold text-[#202124]">Info</h4>
                <ul className="space-y-2 text-sm leading-6 text-[#5D687A]">
                  {infoLinks.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-6 text-[#5D687A]">
                  planext4uofficial@gmail.com <br />
                  +91-9787176868
                </p>
              </div>
 
              <div>
                <h4 className="mb-3 font-semibold text-[#202124]">Company</h4>
                <ul className="space-y-2 text-sm text-[#5D687A]">
                  {companyLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="inline-block transition-colors hover:text-[#89CFF0]"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Help */}
              <div>
                <h4 className="mb-3 font-semibold text-[#202124]">Help</h4>
                <ul className="space-y-2 text-sm text-[#5D687A]">
                  {helpLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="inline-block transition-colors hover:text-[#89CFF0]"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div> 
              <div>
                <h4 className="mb-3 font-semibold text-[#202124]">
                  Consumer Policy
                </h4>
                <ul className="space-y-2 text-sm text-[#5D687A]">
                  {consumerPolicyLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="inline-block transition-colors hover:text-[#89CFF0]"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Logo + Store */}
              <div className="flex flex-col items-start gap-4 sm:col-span-2 lg:col-span-1">
                <div className="rounded-2xl border border-[#D7E7F5] bg-white p-2 shadow-sm">
                  <Image src={footerLogo} alt="P4U Logo" width={112} priority />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Image
                    src={appstore}
                    alt="App Store"
                    width={100}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  />
                  <Image
                    src={googleplay}
                    alt="Google Play"
                    width={100}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  />
                </div>
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="mb-3 font-semibold text-[#202124]">Social</h4>
              <div className="flex flex-wrap gap-2">
                {socialIcons.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={i}
                      href="#"
                      aria-label={s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C7DDF2] bg-white text-[#7A879B] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B8E3F7] hover:text-[#89CFF0] hover:shadow-md"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
 
          <div
            className="mx-4 border-t border-[#C7DDF2]"
          /> 
          <div className="px-4 py-5">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-center text-sm text-[#5D687A] md:text-left">
                Planext4u Solutions India Private Limited Copyright © 2026. All
                Rights Reserved.
              </p>
              <div className="hidden md:flex flex-wrap gap-3 justify-center">
                {paymentMethods.map((m, i) => (
                  <div
                    key={i}
                    className="relative h-9 w-14 overflow-hidden rounded-md border border-[#D7E7F5] bg-white"
                  >
                    <Image
                      src={m.logo}
                      alt={m.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
