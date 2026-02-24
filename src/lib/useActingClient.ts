// src/lib/useActingClient.ts
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

/**
* Acting context for audit fields.
* We no longer depend on a separate "acting context" getter.
* The workstation operator is the acting user.
*/
export function useActingClient() {
  const { operator } = useWorkstation();

  return useMemo(() => {
    const operatorInitials =
      (operator?.initials ?? "").trim().toUpperCase() ||
      initialsFromName(operator?.name) ||
      null;

    return {
      operator,
      acted_by_team_member_id: operator?.teamMemberId ?? null,
      acted_by_initials: operatorInitials,
    };
  }, [operator]);
}
