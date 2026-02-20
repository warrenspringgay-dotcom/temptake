"use client";

import React from "react";
import { WorkstationLockProvider } from "@/components/workstation/WorkstationLockProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <WorkstationLockProvider>{children}</WorkstationLockProvider>;
}