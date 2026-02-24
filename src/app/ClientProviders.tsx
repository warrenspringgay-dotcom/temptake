"use client";

import React from "react";

import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { AuthProvider } from "@/components/AuthProvider";

// ✅ This is the missing piece
import { ToastProvider } from "@/components/ui/use-toast";
// If your project’s ToastProvider actually lives somewhere else,
// change ONLY this import path to match your repo.

import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";


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
            
          </WorkstationLockProvider>
        </AuthProvider>
      </GlobalLoadingProvider>
    </ToastProvider>
  );
}
