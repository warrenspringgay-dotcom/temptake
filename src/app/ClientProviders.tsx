"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import { ToastProvider } from "@/components/ui/use-toast"; // keep your existing provider path

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoadingProvider>
      <AuthProvider>
        <ToastProvider>
          <WorkstationLockProvider>{children}</WorkstationLockProvider>
        </ToastProvider>
      </AuthProvider>
    </GlobalLoadingProvider>
  );
}