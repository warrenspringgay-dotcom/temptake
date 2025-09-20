// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// Benchmark UI components
import NavTabs from "@/components/NavTabs";
import NavUser from "@/components/NavUser";

// <<< IMPORTANT: wraps I18nProvider, Theme, etc. >>>
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food temperature logs, allergens, suppliers and reports",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gray-50 text-slate-900">
        {/* Wrap the entire app (including header) so NavUser/NavTabs can use useI18n */}
        <Providers>
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-4">
            

              <div className="flex-1">
                <NavTabs />
              </div>

              
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
