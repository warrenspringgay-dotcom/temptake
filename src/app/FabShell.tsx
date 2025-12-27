// src/components/FabShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TempFab from "@/components/QuickActionsFab";

export default function FabShell() {
  const pathname = usePathname();
  const { user, ready } = useAuth();

  // While auth is resolving, don't flash the FAB
  if (!ready) return null;

  // No FAB if not logged in
  if (!user) return null;

  // Hide on public / marketing pages
  const hideOnPublic =
    pathname === "/" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/guides") ||
    pathname?.startsWith("/client-launch") ||
    pathname?.startsWith("/signup");

  if (hideOnPublic) return null;

  // Everywhere else for logged-in users
  return <TempFab />;
}
