// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { getUserOrNull } from "@/app/actions/auth";

// ✅ These should be relative to /src/app if the files live there.
// If yours are actually in /src/components, swap these to "@/components/HeaderShell" etc.
import HeaderShell from "./app/HeaderShell";
import FabShell from "./FabShell";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <head>{/* meta/manifest etc */}</head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <HeaderShell user={user} />

              <Pwa />

              <main className="mx-auto max-w-6xl px-4 py-2">{children}</main>

              <script src="https://tally.so/widgets/embed.js" async />

              {/* FAB now respects route rules */}
              <FabShell />

              <ServiceWorkerRegister />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>

        <Analytics />
      </body>
    </html>
  );
}
