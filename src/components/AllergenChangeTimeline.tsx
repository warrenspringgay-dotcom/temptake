// src/components/AllergenChangeTimeline.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type ChangeRow = {
  id: string;
  created_at: string;
  org_id: string | null;
  location_id: string | null;
  item_id: string | null;
  item_name: string | null;
  action: "create" | "update" | "delete" | string;
  staff_initials: string | null;
};

function formatTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AllergenChangeTimeline({
  refreshKey,
}: {
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const orgId = await getActiveOrgIdClient();
        const locationId = await getActiveLocationIdClient();

        if (!orgId) {
          if (!cancelled) setRows([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from("allergen_change_logs")
          .select(
            "id,created_at,org_id,location_id,item_id,item_name,action,staff_initials"
          )
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (locationId) {
          query = query.eq("location_id", locationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!cancelled) {
          setRows(
            (data ?? []).map((r: any) => ({
              id: String(r.id),
              created_at: r.created_at ?? new Date().toISOString(),
              org_id: r.org_id ?? null,
              location_id: r.location_id ?? null,
              item_id: r.item_id ?? null,
              item_name: r.item_name ?? null,
              action: (r.action ?? "update") as ChangeRow["action"],
              staff_initials: r.staff_initials ?? null,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load allergen change log.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const actionBadge = (action: string) => {
    switch (action) {
      case "create":
        return (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            Added
          </span>
        );
      case "delete":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
            Deleted
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Updated
          </span>
        );
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-900">
          Recent allergen changes
        </div>
        {loading && (
          <span className="text-[11px] text-slate-500">Refreshing…</span>
        )}
      </div>

      {err && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50/80 px-2 py-1 text-[11px] text-red-800">
          {err}
        </div>
      )}

      {rows.length === 0 && !err ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-[11px] text-slate-500">
          No recent allergen changes logged yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {r.item_name || "Unnamed item"}
                  </span>
                  {actionBadge(r.action)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.staff_initials
                    ? `By ${r.staff_initials} · `
                    : "By manager · "}
                  {formatTime(r.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
