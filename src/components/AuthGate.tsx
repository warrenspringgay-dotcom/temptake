// src/components/AuthGate.tsx
"use client";

import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { hasRole, type Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  /** Single role or any-of these roles required to view children */
  requireRole?: Role | Role[];
};

export default async function AuthGate({ children, requireRole }: Props) {
  // Get the current session (server action)
  const session = await getSession();
  const user = session?.user ?? null;

  // Not signed in → send to login
  if (!user) {
    redirect("/login");
  }

  // If a role requirement is provided, enforce it
  if (requireRole) {
    const needed: Role[] = Array.isArray(requireRole) ? requireRole : [requireRole];
    const ok = needed.some((r) => hasRole(user, r));
    if (!ok) {
      redirect("/"); // or a dedicated 403 page
    }
  }

  return <>{children}</>;
}
