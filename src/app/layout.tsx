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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111111" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>

      {/* 
        Mobile scroll fix:
        - Lock the app to the viewport height (100dvh handles mobile browser bars properly)
        - Prevent body scrolling glitches with nested layouts
        - Make <main> the scroll container so pages don’t render “off-screen”
      */}
      <body className="bg-gray-100 text-gray-900 h-[100dvh] overflow-hidden">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                <div className="flex h-full min-h-0 flex-col">
                  <Pwa />

                  <Suspense fallback={null}>
                    <HeaderSwitcher />
                  </Suspense>

                  <main className="mx-auto w-full px-3 sm:px-4 md:max-w-6xl flex-1 min-h-0 overflow-y-auto">
                    {children}
                  </main>

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
