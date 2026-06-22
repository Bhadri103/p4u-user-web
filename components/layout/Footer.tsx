"use client";

import {
  Mail,
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
      <footer
        className="w-full mt-2 sm:mt-3 md:mt-4"
     style={{
  background: "#E8F6F6",
}}
      >
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6">
          <div className="pt-10 pb-2 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-2">
              {/* Info */}
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Info</h4>
                <ul className="space-y-2 text-sm text-gray-900">
                  {infoLinks.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-gray-900 flex items-center gap-2">
                  planext4uofficial@gmail.com <br />
                  +91-9787176868
                </p>
              </div>
 
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
                <ul className="space-y-2 text-sm text-gray-900">
                  {companyLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="hover:text-gray-900 transition-colors"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Help */}
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Help</h4>
                <ul className="space-y-2 text-sm text-gray-900">
                  {helpLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="hover:text-gray-900 transition-colors"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div> 
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">
                  Consumer Policy
                </h4>
                <ul className="space-y-2 text-sm text-gray-900">
                  {consumerPolicyLinks.map((i, idx) => (
                    <li key={idx}>
                      <a
                        href="#"
                        className="hover:text-gray-900 transition-colors"
                      >
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Logo + Store */}
              <div className="hidden lg:flex flex-col items-center lg:items-start gap-4">
                <Image src={footerLogo} alt="P4U Logo" width={140} priority />
                <div className="flex items-center justify-center lg:justify-start gap-4">
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
            <div className="mb-8">
              <h4 className="font-semibold mb-3 text-gray-900">Social</h4>
              <div className="flex flex-wrap gap-2">
                {socialIcons.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={i}
                      href="#"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-900 transition-all duration-200"
                      style={{ border: "1.5px solid rgba(255,255,255,0.35)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255,255,255,0.15)";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.8)";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.35)";
                        e.currentTarget.style.color = "#d1d5db";
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
 
          <div
            className="mx-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
          /> 
          <div className="px-4 py-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-400 text-center md:text-left">
                Planext4u Solutions India Private Limited Copyright © 2026. All
                Rights Reserved.
              </p>
              <div className="hidden md:flex flex-wrap gap-3 justify-center">
                {paymentMethods.map((m, i) => (
                  <div
                    key={i}
                    className="relative w-14 h-9 rounded overflow-hidden"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
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