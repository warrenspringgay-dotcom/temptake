"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() || "/";

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 md:px-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="h-6 w-6" />
          <span className="text-base font-semibold tracking-tight">TempTake</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/guides"
            className={cls(
              "hidden rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 sm:inline-flex",
              pathname.startsWith("/guides") && "bg-gray-100"
            )}
          >
            Guides
          </Link>

          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
