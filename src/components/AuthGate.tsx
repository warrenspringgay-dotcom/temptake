// src/components/AuthGate.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/app/actions/auth";
import { hasRole, type Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  requireRole?: Role; // optional: only allow if user has this role
};

/**
 * Server Component guard: redirects to /login if no user,
 * and optionally enforces a required role.
 */
export default async function AuthGate({ children, requireRole }: Props) {
  const user = await getUser(); // returns the authenticated user or null

  if (!user) {
    redirect("/login");
  }

  if (requireRole && !hasRole(user, requireRole)) {
    redirect("/login?reason=forbidden");
  }

  return <>{children}</>;
}
