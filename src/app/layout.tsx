// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import TempFab from "@/components/QuickActionsFab";
import { PHProvider } from "@/components/PosthogProvider";
import { getUserOrNull } from "@/app/actions/auth";
import HeaderShell from "./app/HeaderShell";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserOrNull(); // still used for MobileMenu via HeaderShell

  return (
    <html lang="en">
      <head>
        {/* ...head content... */}
      </head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              {/* Header + NavTabs are hidden on / and /launch via HeaderShell */}
              <HeaderShell user={user} />

              <Pwa />

              <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
              </main>

              {/* Tally script for the whole app */}
              <script src="https://tally.so/widgets/embed.js" async></script>

              <ServiceWorkerRegister />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
        <Analytics />
      </body>
    </html>
  );
}
