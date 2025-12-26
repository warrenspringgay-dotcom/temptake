// src/app/app/HeaderShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

import NavTabs from "@/components/NavTabs";
import OrgName from "@/components/OrgName";
import LocationSwitcher from "@/components/LocationSwitcher";
import UserMenu from "@/components/UserMenu";
import MobileMenu from "@/components/MobileMenu";
import { useAuth } from "@/components/AuthProvider";

export default function HeaderShell() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  // ✅ ensure server + first client render match
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hideOnPublic = useMemo(() => {
    return (
      pathname === "/" ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/signup")
    );
  }, [pathname]);

  // ✅ only decide to hide after mount (prevents hydration mismatch)
  if (mounted && hideOnPublic && !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Logo + brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
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

        {/* Centre: nav tabs (desktop only, gated by auth + billing inside NavTabs) */}
        <div className="flex flex-1 items-center justify-center md:justify-start">
          {!hideOnPublic && ready && user && (
            <nav className="hidden md:block">
              <NavTabs />
            </nav>
          )}
        </div>

        {/* Right side: desktop org/location/user */}
        {ready && user && (
          <div className="hidden items-center gap-3 md:flex">
            <OrgName />
            <LocationSwitcher />
            <UserMenu />
          </div>
        )}

        {/* Mobile hamburger / sheet */}
        <div className="flex md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
