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
  const { operator, getActiveContext } = useWorkstation();

  return useMemo(() => {
    const acting = getActiveContext() as any;

    const operatorInitials =
      acting?.acted_by_initials ||
      (operator?.initials ?? "").trim().toUpperCase() ||
      initialsFromName(operator?.name) ||
      null;

    return {
      operator,
      acted_by_team_member_id: acting?.acted_by_team_member_id ?? null,
      acted_by_initials: operatorInitials,
    };
  }, [operator, getActiveContext]);
}
