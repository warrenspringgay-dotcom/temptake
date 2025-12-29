"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type Tab = { href: string; label: string };

const MARKETING_TABS: Tab[] = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Demo" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing" },
];

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() || "/";

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      {/* Top row: brand + tabs (desktop) + auth */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 md:px-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="h-6 w-6" />
          <span className="text-base font-semibold tracking-tight">TempTake</span>
        </Link>

        {/* Tabs (desktop) */}
        <div className="hidden items-center gap-1 md:flex">
          {MARKETING_TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cls(
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, t.href)
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Right side: auth/actions */}
        <div className="flex items-center gap-2">
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

      {/* Tabs (mobile): simple row under the header */}
      <div className="mx-auto max-w-6xl px-3 pb-2 md:hidden md:px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MARKETING_TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cls(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive(pathname, t.href)
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
