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
import HeaderShell from "@/app/app/HeaderShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111111" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                {/* PWA install prompt etc (no children) */}
                <Pwa />

                {/* ✅ Wrap shell components in Suspense to satisfy useSearchParams() rules */}
                <Suspense fallback={null}>
                  <HeaderShell />
                </Suspense>

                <main className="mx-auto w-full px-3 sm:px-4 md:max-w-6xl">
                  {children}
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
