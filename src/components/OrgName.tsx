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

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("settings")
          .select("org_name")
          .eq("org_id", orgId)     // 👈 match the org
          .maybeSingle();

        if (!cancelled && !error) {
          setName(data?.org_name ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to load org name", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!name) return null;
  return <span className={className}>{name}</span>;
}
