"use client";

import { useMemo } from "react";
import { useWorkstation } from "@/components/workstation/WorkstationLockProvider";

function initialsFromName(name?: string | null) {
  const s = String(name ?? "").trim();
  if (!s) return null;
  const parts = s.split(/\s+/).filter(Boolean);
  const out = parts
    .slice(0, 2)
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .join("");
  return out || null;
}

export function useActingClient() {
  const { operator, getActingContextClient } = useWorkstation();

  return useMemo(() => {
    // Your repo has drifted types between versions, so don't trust them.
    const actingAny = (getActingContextClient?.() ?? {}) as any;

    // Support both naming schemes (current + older)
    const actedByTeamMemberId: string | null =
      (actingAny.acted_by_team_member_id ?? null) ||
      (actingAny.team_member_id ?? null) ||
      (operator?.teamMemberId ?? null);

    const operatorInitials =
      (actingAny.acted_by_initials ?? null) ||
      (operator?.initials ?? "").trim().toUpperCase() ||
      initialsFromName(operator?.name) ||
      null;

    return {
      operator,
      acted_by_team_member_id: actedByTeamMemberId,
      acted_by_initials: operatorInitials,
    };
  }, [operator, getActingContextClient]);
}
