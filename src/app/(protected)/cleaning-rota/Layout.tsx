// src/app/(protected)/cleaning-rota/layout.tsx
import React from "react";
import RequireOperatorRole from "@/components/workstation/RequireOperatorRole";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireOperatorRole minRole="manager">{children}</RequireOperatorRole>;
}