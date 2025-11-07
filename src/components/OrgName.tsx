// src/components/OrgName.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Props = {
  className?: string;
};

export default function OrgName({ className }: Props) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadName() {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          if (!cancelled) setName(null);
          return;
        }

        // 1) Prefer per-org settings row
        const { data: settingsRow, error: sErr } = await supabase
          .from("settings")
          .select("org_name")
          .eq("org_id", orgId)
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sErr) {
          console.warn("OrgName settings read error", sErr);
        }

        let orgName: string | null =
          (settingsRow?.org_name as string | null) ?? null;

        // 2) Fallback to orgs table if needed
        if (!orgName) {
          const { data: orgRow, error: oErr } = await supabase
            .from("orgs")
            .select("name")
            .eq("id", orgId)
            .maybeSingle();

          if (oErr) {
            console.warn("OrgName orgs read error", oErr);
          }

          orgName = (orgRow?.name as string | null) ?? null;
        }

        if (!cancelled) setName(orgName);
      } catch (err) {
        console.error("Failed to load org name", err);
        if (!cancelled) setName(null);
      }
    }

    loadName();

    const handler = () => loadName();
    window.addEventListener("tt-settings-updated", handler);

    return () => {
      cancelled = true;
      window.removeEventListener("tt-settings-updated", handler);
    };
  }, []);

  if (!name) {
    return <span className={className} />;
  }

  return (
    <span className={className} title={name}>
      {name}
    </span>
  );
}
