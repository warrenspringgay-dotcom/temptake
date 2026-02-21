// src/components/workstation/RequireOperatorRole.tsx
import "server-only";
import React from "react";
import { redirect } from "next/navigation";
import { requireOperatorRole } from "@/lib/workstationServer";

export default async function RequireOperatorRole(props: {
  minRole: "staff" | "supervisor" | "manager" | "admin" | "owner";
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const check = await requireOperatorRole(props.minRole);
  if (!check.ok) redirect(props.redirectTo ?? "/dashboard");
  return <>{props.children}</>;
}