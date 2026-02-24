"use client";

import React from "react";

import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/use-toast";

import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

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

            {/* SINGLE global lock screen instance */}
            <WorkstationLockScreen />
          </WorkstationLockProvider>
        </AuthProvider>
      </GlobalLoadingProvider>
    </ToastProvider>
  );
}