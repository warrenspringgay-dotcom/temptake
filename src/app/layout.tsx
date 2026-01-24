// src/app/layout.tsx
import "./globals.css";

import type { ReactNode } from "react";
import React, { Suspense } from "react";
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
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "TempTake",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111111" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.webmanifest" />
      
      </head>

      <body className="bg-gray-100 text-gray-900 min-h-[100dvh]">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                <Pwa />

                {/* Cookie consent + PostHog opt-in/out */}
                <ConsentBootstrap />
                <CookieBanner />

                <Suspense fallback={null}>
                  <HeaderSwitcher />
                </Suspense>

                <main className="w-full">
                  <div className="w-full px-0 sm:px-4 md:mx-auto md:max-w-6xl">
                    {children}
                  </div>
                </main>

                <Suspense fallback={null}>
                  <FabShell />
                  <ServiceWorkerRegister />
                </Suspense>
              </AuthProvider>
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>

        <Analytics />
      </body>
    </html>
  );
}
