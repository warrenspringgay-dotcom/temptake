"use client";

import React from "react";

import { AuthProvider } from "@/components/AuthProvider";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalLoadingProvider>
      <AuthProvider>
        <WorkstationLockProvider>{children}</WorkstationLockProvider>
      </AuthProvider>
    </GlobalLoadingProvider>
  );
}
