"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <GlobalLoadingProvider>
        <AuthProvider>
          <WorkstationLockProvider>{children}</WorkstationLockProvider>
        </AuthProvider>
      </GlobalLoadingProvider>
    </ToastProvider>
  );
}
