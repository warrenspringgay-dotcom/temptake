import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import { getUserOrNull } from "@/app/actions/auth";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister"; // ← added
import Pwa from "@/components/Pwa";





export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <head>
        {/* PWA-friendly meta (safe even if you ignore PWA) */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111111" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* If you don't add app/manifest.ts, you can uncomment the line below and serve /manifest.webmanifest manually
        <link rel="manifest" href="/manifest.webmanifest" />
        */}
      </head>
      <body className="bg-gray-100 text-gray-900">
        {/* STICKY TOP BAR */}
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex h-12 items-center gap-3">
              {/* Left: brand */}
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="/logo.png" width={24} height={24} alt="TempTake" />
                <span className="font-semibold">TempTake</span>
              </Link>

              {/* Middle: tabs (desktop only) */}
              <div className="mx-auto hidden md:block">
                <NavTabs />
              </div>

              {/* Right: desktop user menu OR mobile hamburger */}
              <div className="ml-auto">
                {/* Desktop: small user menu */}
                <div className="hidden md:block">
                  <UserMenu user={user} />
                </div>
                {/* Mobile: single hamburger that includes Help/Settings/Auth */}
                <div className="md:hidden">
                  <MobileMenu user={user} />
                </div>
              </div>
            </div>
          </div>
        </header>
 <Pwa />
        {/* Page container */}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        {/* Register SW on the client (no UI impact) */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
