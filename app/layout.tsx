import './globals.css';
import type { Metadata } from "next";
import { CartProvider } from "@/providers/CartContext";
import { AuthProvider } from "@/providers/AuthContext";
import UserSessionProvider from "@/providers/UserSessionProvider";
import { AppLoadingProvider } from "@/providers/AppLoadingProvider";
import GlobalPopupBanner from "@/components/content/GlobalPopupBanner";
import { AddressProvider } from "@/providers/AddressContext";
import PageTransition from "@/components/layout/PageTransition";
import GlobalImageLoader from "@/components/layout/GlobalImageLoader";
import { LocaleProvider } from "@/providers/LocaleContext";

export const metadata: Metadata = {
  title: {
    default: "Planext4u",
    template: "%s | Planext4u",
  },
  description: "Planext4u — marketplace for products, services, and more.",
  /** Favicon / PWA icon: `app/icon.png` (P4U brand mark). */
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
        <GlobalImageLoader />
        <AppLoadingProvider>
          <AuthProvider>
            <AddressProvider>
              <UserSessionProvider>
                <CartProvider>
                  <PageTransition>{children}</PageTransition>
                  <GlobalPopupBanner />
                </CartProvider>
              </UserSessionProvider>
            </AddressProvider>
          </AuthProvider>
        </AppLoadingProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
