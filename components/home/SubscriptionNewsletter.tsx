"use client";

import { useState } from "react";
import Image from "next/image";
import bg from "../../images/bg-img/sign up.png";
import newsletterRighht from "../../images/bg-img/newsletter-right.png";

export default function SubscriptionNewsletter() {
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!email) return;
    setSubmitting(true);
    setMessage("");
    try {
      const { contentApi } = await import("@/lib/api/content");
      await contentApi.subscribeNewsletter(email);
      setMessage("Subscribed successfully!");
      setEmail("");
    } catch {
      setMessage("Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative px-4 overflow-hidden"> 
      <div className="absolute inset-0 z-0">
        <Image
          src={bg}
          alt="Green vegetable pattern background"
          fill
          className="object-cover"
          priority
        />
      </div> 
      <div className="max-w-7xl mx-auto relative z-10">
        <div className=" overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-0"> 
            <div className="p-6 md:p-8 lg:p-12 order-2 md:order-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 leading-tight">
                Get <span className="text-yellow-400">20% Discount</span> On
                Your First Purchase
              </h2>
              <p className="text-gray-800 mb-4 md:mb-6 text-md md:text-base">
                Just Sign Up & Register it now to become member.
              </p> 
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-4 py-3 md:py-3.5 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm md:text-base"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-black text-white py-3 md:py-3.5 rounded-2xl font-semibold hover:bg-gray-800 transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  {submitting ? "SUBSCRIBING..." : "SUBSCRIBE NOW"}
                </button>
                {message && (
                  <p className={`text-sm mt-2 ${message.includes("success") ? "text-green-700" : "text-red-600"}`}>
                    {message}
                  </p>
                )}
              </div>
            </div> 
            <div className="relative h-48 md:h-full min-h-[250px] md:min-h-[350px] lg:min-h-[400px] order-1 md:order-2">
              <Image
                src={newsletterRighht}
                fill
                alt="Happy customer with cleaning products"
                className="w-full h-full object-contain object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
