"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import HeaderShell from "@/app/app/HeaderShell";
import MarketingHeader from "@/components/MarketingHeader";

const MARKETING_ROUTE_PREFIXES = [
  "/launch",
  "/templates",
  "/sectors",
  "/pricing",
  "/guides",
  "/demo-wall",
  "/login",
  "/signup",
  "/food-hygiene-app",
  "/demo",
] as const;

const MARKETING_EXACT_ROUTES = ["/"] as const;

const MARKETING_SECTOR_ROUTES = [
  "/takeaway-food-safety-app",
  "/cafe-food-safety-app",
  "/restaurant-food-safety-app",
  "/fish-and-chip-shop-food-safety-app",
  "/pub-food-safety-app",
  "/mobile-catering-food-safety-app",
] as const;

export default function HeaderSwitcher() {
  const pathname = usePathname() || "/";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMarketingRoute = useMemo(() => {
    if (MARKETING_EXACT_ROUTES.includes(pathname as (typeof MARKETING_EXACT_ROUTES)[number])) {
      return true;
    }

    if (MARKETING_SECTOR_ROUTES.includes(pathname as (typeof MARKETING_SECTOR_ROUTES)[number])) {
      return true;
    }

    return MARKETING_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  if (!mounted) return null;

  return isMarketingRoute ? <MarketingHeader /> : <HeaderShell />;
}