// src/components/ComplianceWidgetGate.tsx
"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ComplianceIndicatorShell from "@/components/ComplianceIndicatorShell";

export default function ComplianceWidgetGate() {
  const { user, ready } = useAuth();
  const pathname = usePathname();

  // Don’t show anything while auth is still resolving
  if (!ready) return null;

  // Only logged-in users get the widget
  if (!user) return null;

  // Hide on public / auth / billing pages
  const hide =
    pathname === "/" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/billing");

  if (hide) return null;

  // Everywhere else: show the donut widget
  return <ComplianceIndicatorShell />;
}
