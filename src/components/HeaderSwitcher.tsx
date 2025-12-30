"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import HeaderShell from "@/app/app/HeaderShell";
import MarketingHeader from "@/components/MarketingHeader";

export default function HeaderSwitcher() {
  const pathname = usePathname() || "/";

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMarketingRoute = useMemo(() => {
    const p = pathname;

    // marketing / public pages
    if (
      p === "/" ||
      p.startsWith("/launch") ||
      p.startsWith("/pricing") ||
      p.startsWith("/guides") ||
      p.startsWith("/demo-wall") ||
      p.startsWith("/login") ||
      p.startsWith("/signup") ||
      p.startsWith("/app") // public demo dashboard
    ) {
      return true;
    }

    return false;
  }, [pathname]);

  if (!mounted) return null;

  return isMarketingRoute ? <MarketingHeader /> : <HeaderShell />;
}
