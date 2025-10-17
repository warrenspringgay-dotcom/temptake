// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavTabs from "@/components/NavTabs";
import { getSession } from "@/app/actions/auth";
import SignOutButton from "@/components/SignOutButton";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TempTake",
  description: "Food safety & routines",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-slate-900">
        {/* Single-row header with logo + centered tabs + auth on right */}
        <header className="border-b bg-white">
          <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-3">
            {/* Logo (place /public/logo.svg or /public/logo.png) */}
            <Link href="/dashboard" className="flex items-center gap-2 whitespace-nowrap">
              <div className="relative h-6 w-6">
                <Image src="/icon.png" alt="TempTake" fill className="object-contain" />
              </div>
              <span className="font-semibold">TempTake</span>
            </Link>

            {/* Centered nav – single line, no wrap */}
            <div className="flex-1 overflow-x-auto">
              <NavTabs />
            </div>

            {/* Auth info on the right */}
            <div className="ml-2 flex items-center gap-3 whitespace-nowrap">
              {user ? (
                <>
                  <span className="hidden text-sm text-slate-600 sm:block">
                    {user.email}
                  </span>
                  <SignOutButton />
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Cropped main container for all pages */}
        <main>
          <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
