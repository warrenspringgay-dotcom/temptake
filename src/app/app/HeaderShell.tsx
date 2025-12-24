// src/app/app/HeaderShell.tsx
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
import { useAuth } from "@/components/AuthProvider";

export default function HeaderShell() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { hasValid } = useSubscriptionStatus();
  const { user, ready } = useAuth();

  // After login/signup, push the user into the app
  useEffect(() => {
    if (!ready || !user) return;

    if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
      return;
    }

    const nextParam = searchParams.get("next");
    const safeNext =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

    router.replace(safeNext);
    router.refresh();
  }, [ready, user, pathname, searchParams, router]);

  const hideHeader =
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname === "/app" ||
    pathname.startsWith("/demo-wall") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  if (hideHeader || !ready) return null;

  const showNav = !!user;
  const showLocation = !!user && hasValid;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-12 items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" width={24} height={24} alt="TempTake" />
            <span className="font-semibold">TempTake</span>
          </Link>

          <div className="flex-1 md:hidden">
            <OrgName className="block truncate text-center text-xs font-semibold" />
          </div>

          <div className="mx-auto hidden md:block">
            {showNav && <NavTabs />}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {showLocation && (
              <div className="max-w-[180px] flex-1 md:max-w-[220px]">
                <LocationSwitcher />
              </div>
            )}

            <div className="hidden md:block">
              <UserMenu />
            </div>

            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
