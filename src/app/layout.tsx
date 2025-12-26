// src/app/layout.tsx
import "./globals.css";

import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { AuthProvider } from "@/components/AuthProvider";

import Pwa from "@/components/Pwa";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import TempFab from "@/components/QuickActionsFab";
import ComplianceIndicatorShell from "@/components/ComplianceIndicatorShell";
import HeaderShell from "@/app/app/HeaderShell"; // ← your existing header with NavTabs
// src/app/layout.tsx



export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
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

                {/* Global app header: logo + NavTabs + user + location switcher */}
                <HeaderShell />

                {/* Single place where page content is rendered */}
                <main className="mx-auto max-w-6xl px-4 py-4">
                  {children}
                </main>

                {/* Floating / global widgets */}
                <ComplianceIndicatorShell />
                <TempFab />
                <ServiceWorkerRegister />
              </AuthProvider>
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>

        <Analytics />
      </body>
    </html>
  );
}
