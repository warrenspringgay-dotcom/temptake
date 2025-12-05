// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { getUserOrNull } from "@/app/actions/auth";
import HeaderShell from "./app/HeaderShell";
import FabShell from "./FabShell"; // 👈 NEW

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
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

              <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
              </main>

              <script
                src="https://tally.so/widgets/embed.js"
                async
              ></script>

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
