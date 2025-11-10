// src/components/RequireRole.tsx
"use client";

import React from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { hasRole, type Role } from "@/lib/roles";

type Props = {
  /** Content to render if the user has one of the allowed roles */
  children: React.ReactNode;
  /** Allowed roles; if omitted, any logged-in member is fine */
  allow?: Role | Role[];
  /** Optional fallback to show if user is not allowed (defaults to nothing) */
  fallback?: React.ReactNode;
};

export default function RequireRole({
  children,
  allow,
  fallback = null,
}: Props) {
  const { member, loading } = useCurrentMember();

  // While loading, don’t render anything special (you can swap in a spinner)
  if (loading) return null;

  // No member record – treat as not allowed
  if (!member) return <>{fallback}</>;

  const role = (member.role ?? "staff") as string;

  // Normalise allow into an array
  const allowedList = allow
    ? Array.isArray(allow)
      ? allow
      : [allow]
    : null;

  // If roles are specified, check them
  if (allowedList && !allowedList.some((r) => hasRole(role, r))) {
    return <>{fallback}</>;
  }

  // Authorised -> render children
  return <>{children}</>;
}
