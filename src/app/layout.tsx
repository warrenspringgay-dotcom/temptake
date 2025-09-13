import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import NavTabs from "@/components/NavTabs";
import { SettingsProvider } from "@/components/SettingsProvider";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food safety logging",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* Make settings context available everywhere */}
        <SettingsProvider>
          {/* Wrap Nav in Suspense so /404 and similar routes don’t error */}
          <Suspense fallback={null}>
            <NavTabs />
          </Suspense>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}