// src/components/OrgName.tsx
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Props = {
  className?: string;
};

export default function OrgName({ className }: Props) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) return;

        const { data, error } = await supabase
          .from("orgs")
          .select("name")
          .eq("id", orgId)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.error("OrgName error", error);
          setName(null);
        } else {
          const raw = (data?.name ?? "").toString().trim();
          setName(raw || null);
        }
      } catch (e) {
        if (!alive) return;
        console.error("OrgName exception", e);
        setName(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!name) return null;

  return (
    <span className={clsx("text-xs font-medium text-slate-600", className)}>
      {name}
    </span>
  );
}
