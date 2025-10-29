// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import NavTabs from "@/components/NavTabs";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food safety & operations logging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        {/* Sticky two-row header (logo + centered tabs) */}
        <NavTabs />

        {/* Centered page container — restrict width on desktop */}
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <main className="py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
