// src/app/layout.tsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import { getUserOrNull } from "@/app/actions/auth";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Pwa from "@/components/Pwa";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider"; // 👈 ADD
import TempFab from "@/components/QuickActionsFab";
import { PHProvider } from "@/components/PosthogProvider";
import { Analytics } from "@vercel/analytics/next"
// src/app/layout.tsx
// ...imports above stay the same...

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserOrNull(); // still used for MobileMenu

  return (
    <html lang="en">
      <head>
        {/* ...head content... */}
      </head>

      <body className="bg-gray-100 text-gray-900">
        <PHProvider>
          <ToastProvider>
            <GlobalLoadingProvider>
              {/* STICKY TOP BAR */}
              <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                <div className="mx-auto max-w-6xl px-4">
                  <div className="flex h-12 items-center gap-3">
                    {/* Left: brand */}
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <Image
                        src="/logo.png"
                        width={24}
                        height={24}
                        alt="TempTake"
                      />
                      <span className="font-semibold">TempTake</span>
                    </Link>

                    {/* Mobile: business name centered */}
                    <div className="flex-1 md:hidden">
                      <OrgName className="block truncate text-center text-xs font-semibold" />
                    </div>

                    {/* Desktop: nav tabs */}
                    <div className="mx-auto hidden md:block">
                      <NavTabs />
                    </div>

                    {/* Right side */}
                    <div className="ml-auto flex items-center gap-3">
                      <div className="max-w-[180px] flex-1 md:max-w-[220px]">
                        <LocationSwitcher />
                      </div>

                      {/* Desktop menu */}
                      <div className="hidden md:block">
                        {/* ⬇️ remove user prop */}
                        <UserMenu />
                      </div>

                      {/* Mobile menu */}
                      <div className="md:hidden">
                        {/* MobileMenu *does* still receive user, that’s fine */}
                        <MobileMenu user={user} />
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <Pwa />

              <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

              <script src="https://tally.so/widgets/embed.js" async></script>

              <ServiceWorkerRegister />
            </GlobalLoadingProvider>
          </ToastProvider>
        </PHProvider>
        <Analytics />
      </body>
    </html>
  );
}
