"use client";

import { usePathname } from "next/navigation";
import ComplianceIndicatorShell from "./ComplianceIndicatorShell";

export default function ComplianceWidgetGate() {
  const pathname = usePathname();

  // While pathname is undefined during first render, show nothing
  if (!pathname) return null;

  // Pages where the widget should NOT appear
  const hide =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/launch") ||
    pathname.startsWith("/client-landing") ||
    pathname.startsWith("/demo-wall") ||
    pathname.startsWith("/pricing");

  if (hide) return null;

  return <ComplianceIndicatorShell />;
}
