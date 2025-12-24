// src/app/layout.tsx
import "./globals.css";

import React from "react";
import { Analytics } from "@vercel/analytics/next";

import { PHProvider } from "@/components/PosthogProvider";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { AuthProvider } from "@/components/AuthProvider";
import Pwa from "@/components/Pwa";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ComplianceIndicatorShell from "@/components/ComplianceIndicatorShell";
import ComplianceWidgetGate from "@/components/ComplianceWidgetGate";
// Header + FAB live in app/ so import relatively
import HeaderShell from "./app/HeaderShell";
import FabShell from "./FabShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111111" />
      </head>
      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                {/* PWA shell (no children) */}
                <Pwa />

            
<HeaderShell />
<main className="mx-auto max-w-6xl px-4 py-2">{children}</main>
<ComplianceWidgetGate />


                {/* Main content */}
                <main className="mx-auto max-w-6xl px-4 py-2">
                  {children}
                </main>

                {/* Floating compliance donut */}
                <ComplianceIndicatorShell />

                {/* FAB, service worker, etc */}
                <FabShell />
                <ServiceWorkerRegister />
              </AuthProvider>

              {/* Vercel analytics */}
              <Analytics />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
      </body>
    </html>
  );
}
