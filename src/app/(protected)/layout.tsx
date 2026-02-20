// src/app/(protected)/layout.tsx
import React from "react";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";
import WorkstationLockScreen from "@/components/workstation/WorkstationLockScreen";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
     <WorkstationLockProvider>
    
     

      {/* Single app content area used by ALL protected pages */}
     <main className="w-full px-0 md:mx-auto md:max-w-screen-2xl
">
  <WorkstationLockScreen />
  {children}
</main>

      
    
      </WorkstationLockProvider>
  );
}
