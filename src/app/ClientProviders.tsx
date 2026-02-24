// src/app/ClientProviders.tsx
"use client";

import React from "react";

import { ToastProvider } from "@/components/ui/use-toast";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import { PHProvider } from "@/components/PosthogProvider";
import { AuthProvider } from "@/components/AuthProvider";



export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider>
      <ToastProvider>
        <GlobalLoadingProvider>
          <AuthProvider>
            
              {children}
           
          </AuthProvider>
        </GlobalLoadingProvider>
      </ToastProvider>
    </PHProvider>
  );
}