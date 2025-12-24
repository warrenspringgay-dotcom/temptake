// src/components/ComplianceWidgetGate.tsx
"use client";

import { usePathname } from "next/navigation";
import ComplianceIndicatorShell from "./ComplianceIndicatorShell";

const HIDE_EXACT = ["/", "/login", "/signup", "/client", "/client/launch"];
const HIDE_PREFIX = ["/client/"];

export default function ComplianceWidgetGate() {
  const pathname = usePathname() || "/";

  const hide =
    HIDE_EXACT.includes(pathname) ||
    HIDE_PREFIX.some((prefix) => pathname.startsWith(prefix));

  if (hide) return null;

  return <ComplianceIndicatorShell />;
}
