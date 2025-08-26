// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food hygiene temperature logs (UK HACCP-friendly)",
  icons: {
    icon: "/temptake-192.png",       // favicon in tab
    shortcut: "/temptake-192.png",   // pinned/tabbed browsers
    apple: "/temptake-192.png",      // iOS/Android homescreen
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
