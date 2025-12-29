"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Minimal launch-page header.
 * Keep it simple: brand + 1-2 actions.
 * Users are not here to admire navigation, they want to do a thing.
 */
export default function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() || "/";

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-3 sm:px-4 md:mx-auto md:max-w-6xl">
        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="TempTake logo"
            width={28}
            height={28}
            className="h-7 w-7"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            TempTake
          </span>
        </Link>

        {/* Tiny marketing nav (optional, keep minimal) */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/guides"
            className={cls(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive("/guides")
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            Guides
          </Link>
          <Link
            href="/pricing"
            className={cls(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive("/pricing")
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            Pricing
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
