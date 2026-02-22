"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

export type EffectiveOperator = {
  source: "operator" | "auth" | "none";
  name: string | null;
  initials: string | null;
  userId: string | null;       // auth user id (if any)
  teamMemberId: string | null; // operator team member id (if any)
  role: string | null;
};

function makeInitials(nameOrEmail: string | null) {
  if (!nameOrEmail) return null;
  const s = nameOrEmail.trim();
  if (!s) return null;

  // If it's an email, use first letters of first two segments
  if (s.includes("@")) {
    const left = s.split("@")[0] ?? "";
    const parts = left.split(/[.\s_-]+/).filter(Boolean);
    const a = (parts[0]?.[0] ?? "").toUpperCase();
    const b = (parts[1]?.[0] ?? "").toUpperCase();
    return (a + b) || null;
  }

  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return (a + b) || null;
}

export function useEffectiveOperator(): EffectiveOperator {
  const { operator } = useWorkstation();
  const { user, ready } = useAuth();

  return useMemo(() => {
    if (operator) {
      return {
        source: "operator",
        name: operator.name ?? null,
        initials: (operator.initials ?? null) || makeInitials(operator.name ?? null),
        userId: user?.id ?? null,
        teamMemberId: operator.teamMemberId ?? null,
        role: operator.role ?? null,
      };
    }

    if (ready && user) {
      return {
        source: "auth",
        name: user.user_metadata?.full_name ?? user.email ?? null,
        initials: makeInitials(user.user_metadata?.full_name ?? user.email ?? null),
        userId: user.id,
        teamMemberId: null,
        role: null,
      };
    }

    return {
      source: "none",
      name: null,
      initials: null,
      userId: null,
      teamMemberId: null,
      role: null,
    };
  }, [operator, ready, user]);
}