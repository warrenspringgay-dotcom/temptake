"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

import NavTabs from "@/components/NavTabs";
import LocationSwitcher from "@/components/LocationSwitcher";
import UserMenu from "@/components/UserMenu";
import MobileMenu from "@/components/MobileMenu";
import { useAuth } from "@/components/AuthProvider";

export default function HeaderShell() {
  const { ready, user } = useAuth();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isPublicRoute = useMemo(() => {
    const p = pathname || "";
    return (
      p === "/" ||
      p.startsWith("/login") ||
      p.startsWith("/signup") ||
      p.startsWith("/pricing") ||
      p.startsWith("/guides") ||
      p.startsWith("/templates") ||
      p.startsWith("/tools") ||
      p.startsWith("/demo-wall") ||
      p.startsWith("/app")
    );
  }, [pathname]);

  const logoHref = user ? "/dashboard" : "/";

  if (mounted && !user && (pathname?.startsWith("/login") || pathname?.startsWith("/signup"))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center gap-3 px-3 sm:px-4 md:mx-auto md:max-w-6xl md:gap-4">
        <Link href={logoHref} className="flex items-center gap-2">
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

        <div className="flex flex-1 items-center justify-center md:justify-start">
          {isPublicRoute ? (
            <nav className="hidden md:block">
              <NavTabs mode="public" />
            </nav>
          ) : (
            ready &&
            user && (
              <nav className="hidden md:block">
                <NavTabs mode="app" />
              </nav>
            )
          )}
        </div>

        {isPublicRoute ? (
          <div className="hidden items-center gap-2 md:flex">
            {ready && user ? (
              <UserMenu />
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        ) : (
          ready &&
          user && (
            <div className="hidden items-center gap-2 md:flex">
              <LocationSwitcher />
              <UserMenu />
            </div>
          )
        )}

        <div className="flex md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}