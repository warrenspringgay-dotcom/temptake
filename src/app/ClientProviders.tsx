"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import WorkstationLockProvider, { useWorkstation } from "@/components/workstation/WorkstationLockProvider";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";
import { usePathname } from "next/navigation";

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset") ||
    pathname.startsWith("/forgot")
  );
}

function WorkstationLockLayer() {
  const ws = useWorkstation();
  const pathname = usePathname();

  // Never block auth pages
  if (isAuthRoute(pathname)) return null;

  // Only show after auth + org/location exist
  if (!ws.hasSession) return null;
  if (!ws.orgId || !ws.locationId) return null;

  // Only show if locked OR modal opened explicitly
  if (!ws.locked && !ws.isLockModalOpen) return null;

  return <WorkstationLockScreen onClose={() => ws.closeLockModal()} />;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoadingProvider>
      <AuthProvider>
        <WorkstationLockProvider>
          {children}
          <WorkstationLockLayer />
        </WorkstationLockProvider>
      </AuthProvider>
    </GlobalLoadingProvider>
  );
}
