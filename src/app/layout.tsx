// src/app/layout.tsx
import "./globals.css";

import type { ReactNode } from "react";
import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { AuthProvider } from "@/components/AuthProvider";

import Pwa from "@/components/Pwa";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import FabShell from "@/app/FabShell";

import HeaderSwitcher from "@/components/HeaderSwitcher";
import CookieBanner from "@/components/CookieBanner";
import ConsentBootstrap from "@/components/ConsentBootstrap";
import AppFooter from "@/components/AppFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TempTake",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      // Optional but helps some browsers behave:
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                <div className="flex min-h-[100dvh] flex-col">
                  <Pwa />

                  {/* Cookie consent + PostHog opt-in/out */}
                  <ConsentBootstrap />
                  <CookieBanner />

                  <Suspense fallback={null}>
                    <HeaderSwitcher />
                  </Suspense>

                  {/* Main app content */}
                  <main className="w-full flex-1">
                    <div className="w-full px-0 sm:px-4 md:mx-auto md:max-w-6xl">
                      {children}
                    </div>
                  </main>

                  {/* Footer sits outside content container so it behaves like a real footer */}
                  <AppFooter />

                  <Suspense fallback={null}>
                    <FabShell />
                    <ServiceWorkerRegister />
                  </Suspense>
                </div>
              </AuthProvider>
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>

        <Analytics />
      </body>
    </html>
  );
}
