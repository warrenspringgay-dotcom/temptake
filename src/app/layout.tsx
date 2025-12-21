// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import ComplianceWidget from "@/components/ComplianceWidget";
import ComplianceIndicatorShell from "@/components/ComplianceIndicatorShell";
import FabShell from "./FabShell";

import { AuthProvider } from "@/components/AuthProvider";
import HeaderShell from "../app/app/HeaderShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>{/* meta/manifest etc */}</head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                <Pwa />

                {/* Header/top bar (logo, user menu, nav) */}
                <HeaderShell />

                <ComplianceWidget />

                <main className="mx-auto max-w-6xl px-4 py-2">{children}</main>

                <script src="https://tally.so/widgets/embed.js" async />

                <ComplianceIndicatorShell />
                <FabShell />
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
