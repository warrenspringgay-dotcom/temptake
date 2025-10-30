import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import { getUserOrNull } from "@/app/actions/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
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

        {/* Page container */}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
