import './globals.css';
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { CartProvider } from "@/providers/CartContext";
import { AuthProvider } from "@/providers/AuthContext";
import { AppLoadingProvider } from "@/providers/AppLoadingProvider";
import GlobalPopupBanner from "@/components/content/GlobalPopupBanner";

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        <AppLoadingProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <GlobalPopupBanner />
            </CartProvider>
          </AuthProvider>
        </AppLoadingProvider>
      </body>
    </html>
  );
}