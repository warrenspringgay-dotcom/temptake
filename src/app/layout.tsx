// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavTabsServer from "@/components/NavTabsServer";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food safety & compliance logging",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {/* Top nav that switches Login/Logout based on session */}
        {/* Server component wrapper to avoid client/server mismatch */}
        {/* If you don't want a nav on the login page, you can conditionally render here */}
        <NavTabsServer />
        <div className="mx-auto max-w-6xl p-4">{children}</div>
      </body>
    </html>
  );
}
