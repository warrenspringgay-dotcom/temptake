// src/components/RequireRole.tsx
"use client";

import React from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { normalizeRole, type Role } from "@/lib/roles";

type Props = {
  /** Allowed roles; if omitted, any logged-in member is fine */
  allow?: Role[];
  children: React.ReactNode;
};

export default function RequireRole({ allow, children }: Props) {
  const { member, loading, error } = useCurrentMember();

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-sm text-slate-500">
        Loading permissions…
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
        We couldn&apos;t confirm your team permissions. Please sign out and
        back in, or ask your manager to check your account.
      </div>
    );
  }

  // If no explicit allow list, any member is OK.
  if (!allow || allow.length === 0) {
    return <>{children}</>;
  }

  const role = normalizeRole(member.role);
  const ok = allow.includes(role);

  if (!ok) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
        View only – ask a manager or owner if you need to change this.
      </div>
    );
  }

  return <>{children}</>;
}
