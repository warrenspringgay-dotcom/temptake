// src/app/ClientProviders.tsx
"use client";

import React from "react";

import { AuthProvider } from "@/components/AuthProvider";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { ToastProvider } from "@/components/ui/use-toast";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import { PHProvider } from "@/components/PosthogProvider";
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    
    <GlobalLoadingProvider>
        <PHProvider>
      <AuthProvider>
        <ToastProvider>
          <WorkstationLockProvider>{children}</WorkstationLockProvider>
        </ToastProvider>
      </AuthProvider>
      </PHProvider>
    </GlobalLoadingProvider>
    
  );
}