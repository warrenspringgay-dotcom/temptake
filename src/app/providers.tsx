// src/app/Providers.tsx
"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider>
      <ToastProvider>
        <GlobalLoadingProvider>
          <AuthProvider>{children}</AuthProvider>
        </GlobalLoadingProvider>
      </ToastProvider>
    </PHProvider>
  );
}
