// src/app/FabShell.tsx
"use client";

import { usePathname } from "next/navigation";
import TempFab from "@/components/QuickActionsFab";

export default function FabShell() {
  const pathname = usePathname();

  // Same hide rules as HeaderShell (no FAB on marketing/demo pages)
  const hideFab =
    pathname === "/" ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/pricing") ||
    pathname === "/app" ||
    pathname.startsWith("/demo-wall");

  if (hideFab) return null;

  return <TempFab />;
}
