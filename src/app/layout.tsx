// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
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
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <head>{/* your meta/manifest tags here */}</head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              {/* Header with brand, nav, location, user menu */}
              <HeaderShell user={user} />

              <Pwa />

              <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
              </main>

              {/* Tally script for the whole app */}
              <script
                src="https://tally.so/widgets/embed.js"
                async
              ></script>

              {/* FAB – if you want this hidden with no sub, we can hook it
                  up to the same useSubscriptionStatus later */}
              <TempFab />

              <ServiceWorkerRegister />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
        <Analytics />
      </body>
    </html>
  );
}
