// src/app/HeaderShell.tsx
"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import NavTabs from "@/components/NavTabs";
import MobileMenu from "@/components/MobileMenu";
import UserMenu from "@/components/UserMenu";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

type HeaderShellProps = {
  user: any;
};

export default function HeaderShell({ user }: HeaderShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasValid } = useSubscriptionStatus();

  // Auto-redirect away from /login once we know the user is logged in
  useEffect(() => {
    if (!user) return;
    if (!pathname.startsWith("/login")) return;

    const nextParam = searchParams.get("next");

    // Basic safety: only allow internal relative paths
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

    router.replace(safeNext);
  }, [user, pathname, searchParams, router]);

  // Pages that should NOT show the header or nav at all
  const hideHeader =
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname === "/app" ||
    pathname.startsWith("/demo-wall");

  if (hideHeader) return null;

  // When there is no valid subscription/trial:
  // - Keep the top bar + user menu
  // - Hide NavTabs + location switcher
  const showNavAndLocation = hasValid;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-12 items-center gap-3">
          {/* Left: brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" width={24} height={24} alt="TempTake" />
            <span className="font-semibold">TempTake</span>
          </Link>

          {/* Mobile: business name centered */}
          <div className="flex-1 md:hidden">
            <OrgName className="block truncate text-center text-xs font-semibold" />
          </div>

          {/* Desktop nav tabs – ONLY when sub/trial is valid */}
          <div className="mx-auto hidden md:block">
            {showNavAndLocation && <NavTabs />}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Location switcher also frozen without a valid sub */}
            {showNavAndLocation && (
              <div className="max-w-[180px] flex-1 md:max-w-[220px]">
                <LocationSwitcher />
              </div>
            )}

            {/* Desktop user menu (always available) */}
            <div className="hidden md:block">
              <UserMenu />
            </div>

            {/* Mobile menu – still available so they can reach Billing etc. */}
            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
