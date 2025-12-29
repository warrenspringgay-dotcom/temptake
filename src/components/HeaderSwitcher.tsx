"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

import HeaderShell from "@/app/app/HeaderShell";
import MarketingHeader from "@/components/MarketingHeader";

/**
 * Picks the right header:
 * - MarketingHeader on public/launch routes
 * - HeaderShell inside the app
 *
 * Uses pathname only (no file moving).
 * Uses mounted guard to avoid hydration mismatches.
 */
export default function HeaderSwitcher() {
  const pathname = usePathname();
  const { user } = useAuth();

  // ✅ ensure server + first client render match
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMarketingRoute = useMemo(() => {
    const p = pathname || "/";

    // Public/launch routes that should show the marketing header
    if (
      p === "/" ||
      p.startsWith("/login") ||
      p.startsWith("/signup") ||
      p.startsWith("/pricing") ||
      p.startsWith("/guides") ||
      p.startsWith("/demo-wall") ||
      p.startsWith("/app") // your public demo dashboard
    ) {
      return true;
    }

    // Add other public pages here if needed
    // e.g. /privacy, /terms, /blog, etc
    if (p.startsWith("/privacy") || p.startsWith("/terms")) return true;

    return false;
  }, [pathname]);

  // ✅ prevent hydration weirdness on first paint
  if (!mounted) return null;

  // Marketing header always on marketing routes
  if (isMarketingRoute) {
    return <MarketingHeader signedIn={!!user} />;
  }

  // In-app header everywhere else
  return <HeaderShell />;
}
