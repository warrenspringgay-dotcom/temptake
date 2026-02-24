// src/app/ClientProviders.tsx
"use client";

import React from "react";

import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { AuthProvider } from "@/components/AuthProvider";

import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider>
      <ToastProvider>
        <GlobalLoadingProvider>
          <AuthProvider>
            <WorkstationLockProvider>
              {children}
              <WorkstationLockScreen />
            </WorkstationLockProvider>
          </AuthProvider>
        </GlobalLoadingProvider>
      </ToastProvider>
    </PHProvider>
  );
}