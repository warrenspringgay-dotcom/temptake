// src/app/layout.tsx
import "./globals.css";

import NavTabs from "@/components/NavTabs";

// src/app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "TempTake",
    template: "%s | TempTake",
  },
  description: "Food safety & temperature logging",
  icons: {
    icon: "/favicon.ico",        // put favicon.ico in /public
    apple: "/icon-192.png",      // optional PWA icons in /public
    shortcut: "/favicon.ico",
  },
};

// ...rest of your layout component


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        
        <NavTabs />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      
      </body>
    </html>
  );
}