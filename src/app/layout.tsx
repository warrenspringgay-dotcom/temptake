// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import Providers from "@/components/Providers";
import NavTabs from "@/components/NavTabs";
import UserMenu from "@/components/UserMenu"; // optional – remove if you don’t have it

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food temperature logging & reporting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Providers>
          {/* Top app bar (kept minimal) */}
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
              <NavTabs />
              <UserMenu />
            </div>
          </header>

          {/* Page content */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
