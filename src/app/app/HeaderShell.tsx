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

  // Public routes where we hide the header (or at least the nav)
  const hideOnPublic = useMemo(() => {
    const p = pathname || "";
    return (
      p === "/" ||
      p.startsWith("/login") ||
      p.startsWith("/signup") ||
      p.startsWith("/pricing") ||
      p.startsWith("/guides") ||
      p.startsWith("/demo-wall") ||
      p.startsWith("/app") // demo dashboard (public)
    );
  }, [pathname]);

  // ✅ only decide to hide after mount (prevents hydration mismatch)
  if (mounted && hideOnPublic && !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      {/* ✅ full width on mobile, constrained on md+ */}
      <div className="flex h-14 w-full items-center gap-3 px-3 sm:px-4 md:mx-auto md:max-w-6xl md:gap-4">
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
