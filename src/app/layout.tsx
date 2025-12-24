// src/app/layout.tsx
import "./globals.css";

import { PHProvider } from "@/components/PosthogProvider";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { AuthProvider } from "@/components/AuthProvider";
// import Pwa from "@/components/Pwa";   // ⛔️ TEMP: remove for debugging
import { Analytics } from "@vercel/analytics/react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              <AuthProvider>
                {/* 🔧 TEMP: minimal shell, no header, no widgets, no PWA wrapper */}
                <main className="mx-auto max-w-6xl px-4 py-2">
                  {children}
                </main>

                <Analytics />
              </AuthProvider>
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
      </body>
    </html>
  );
}
