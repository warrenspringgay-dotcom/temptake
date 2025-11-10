// src/hooks/useCurrentMember.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { normalizeRole, type Role } from "@/lib/roles";

export type CurrentMember = {
  id: string;
  org_id: string;
  name: string | null;
  email: string | null;
  initials: string | null;
  role: Role;
  active: boolean;
} | null;

export function useCurrentMember() {
  const [member, setMember] = useState<CurrentMember>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [orgId, userRes] = await Promise.all([
          getActiveOrgIdClient(),
          supabase.auth.getUser(),
        ]);

        const email = userRes.data.user?.email?.toLowerCase() ?? null;

        if (!orgId || !email) {
          if (!cancelled) {
            setMember(null);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("id, org_id, name, email, initials, role, active")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          if (!data) {
            // user exists but not in team_members yet
            setMember(null);
          } else {
            setMember({
              id: data.id,
              org_id: data.org_id,
              name: data.name ?? null,
              email: data.email ?? null,
              initials: data.initials ?? null,
              role: normalizeRole(data.role),
              active: data.active ?? true,
            });
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load current member.");
          setMember(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    member,
    loading,
    error,
    role: member?.role ?? "",
    isActive: !!member?.active,
  };
}
