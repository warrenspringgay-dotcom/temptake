// src/app/layout.tsx
import "./globals.css";

import type { ReactNode } from "react";
import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import Pwa from "@/components/Pwa";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import FabShell from "@/app/FabShell";

import HeaderSwitcher from "@/components/HeaderSwitcher";
import CookieBanner from "@/components/CookieBanner";
import ConsentBootstrap from "@/components/ConsentBootstrap";
import MainWidthShell from "@/components/MainWidthShell";

import ClientProviders from "@/app/ClientProviders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TempTake - Food Hygiene App",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-gray-100 text-gray-900">
        <ClientProviders>
          <Pwa />

          <ConsentBootstrap />
          <CookieBanner />

          <Suspense fallback={null}>
            <HeaderSwitcher />
          </Suspense>

          <main className="w-full">
            <MainWidthShell>{children}</MainWidthShell>
          </main>

          <Suspense fallback={null}>
            <FabShell />
            <ServiceWorkerRegister />
          </Suspense>
        </ClientProviders>

        <Analytics />
      </body>
    </html>
  );
}