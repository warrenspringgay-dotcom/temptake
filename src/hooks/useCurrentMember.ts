// src/hooks/useCurrentMember.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import type { Role } from "@/lib/roles";

export type CurrentMember = {
  id: string;
  org_id: string;
  email: string | null;
  initials: string | null;
  role: Role;
  active: boolean;
  name: string;
};

type UseCurrentMemberState = {
  member: CurrentMember | null;
  loading: boolean;
  error: string | null;
};

/** Normalize whatever is in team_members.role into our Role union */
function normalizeRole(input: string | null | undefined): Role {
  const v = (input ?? "").toLowerCase();
  if (v === "owner" || v === "admin") return "owner";
  if (v === "manager") return "manager";
  return "staff";
}

export function useCurrentMember(): UseCurrentMemberState {
  const [state, setState] = useState<UseCurrentMemberState>({
    member: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));

        const [{ data: userRes }, orgId] = await Promise.all([
          supabase.auth.getUser(),
          getActiveOrgIdClient(),
        ]);

        const email = userRes.user?.email?.toLowerCase() ?? null;

        // No org or no email → no member, but we still keep hooks order intact.
        if (!orgId || !email) {
          if (!cancelled) {
            setState({ member: null, loading: false, error: null });
          }
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("id, org_id, email, initials, role, active, name")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          if (!cancelled) {
            setState({ member: null, loading: false, error: null });
          }
          return;
        }

        const member: CurrentMember = {
          id: String(data.id),
          org_id: String(data.org_id),
          email: data.email ?? null,
          initials: data.initials ?? null,
          role: normalizeRole(data.role),
          active: data.active ?? true,
          name: data.name ?? data.email ?? "Unknown",
        };

        if (!cancelled) {
          setState({ member, loading: false, error: null });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState({
            member: null,
            loading: false,
            error: err?.message ?? "Failed to load team member",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
