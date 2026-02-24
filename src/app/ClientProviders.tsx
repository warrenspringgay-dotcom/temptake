"use client";

import React from "react";
import { usePathname } from "next/navigation";

import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/use-toast";

import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

function ShouldShowWorkstationLock() {
  const pathname = usePathname() || "";

  // Don’t ever block auth pages
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  if (isAuthRoute) return null;

  // If you have other public pages (marketing site etc), exclude them too:
  // const isPublic = pathname === "/" || pathname.startsWith("/privacy") || pathname.startsWith("/cookie");
  // if (isPublic) return null;

  return <WorkstationLockScreen />;
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <GlobalLoadingProvider>
        <AuthProvider>
          <WorkstationLockProvider>
            {children}

            {/* One global instance, but never on auth routes */}
            <ShouldShowWorkstationLock />
          </WorkstationLockProvider>
        </AuthProvider>
      </GlobalLoadingProvider>
    </ToastProvider>
  );
}