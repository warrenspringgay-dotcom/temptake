// src/app/layout.tsx
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import { getUserOrNull } from "@/app/actions/auth"; // same as your getUserOrNull

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrNull();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
            {/* Logo + brand */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" width={26} height={26} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
            </Link>

            {/* Tabs (hidden on mobile) */}
            <div className="mx-auto hidden md:block">
              <NavTabs />
            </div>

            {/* Auth action (text changes if logged in) – hidden on xs to leave room for burger */}
            <div className="hidden sm:block">
              {user ? (
                <Link href="/logout" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-100">
                  Sign out
                </Link>
              ) : (
                <Link href="/login" className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-100">
                  Login
                </Link>
              )}
            </div>

            {/* Hamburger – always on the far-right */}
            <MobileMenu user={user} />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
