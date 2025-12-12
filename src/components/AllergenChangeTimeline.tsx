"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type LogRow = {
  id: string;
  org_id: string;
  location_id: string | null;
  item_id: string;
  item_name: string | null;
  action: "create" | "update" | "delete" | string;
  staff_initials: string | null;
  created_at: string;
};

type Props = {
  refreshKey?: number;
};

function formatDateTimeUK(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function formatAction(action: string) {
  switch (action) {
    case "create":
      return "Created item";
    case "update":
      return "Updated item";
    case "delete":
      return "Deleted item";
    default:
      return action;
  }
}

export default function AllergenChangeTimeline({ refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadErr(null);

      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setRows([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("allergen_change_logs")
          .select(
            "id, org_id, location_id, item_id, item_name, action, staff_initials, created_at"
          )
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          if (!cancelled) {
            setLoadErr(error.message);
            setRows([]);
          }
        } else if (!cancelled) {
          setRows((data ?? []) as LogRow[]);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadErr(e?.message ?? "Failed to load allergen change log.");
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

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Recent allergen changes
        </div>
        {loading && (
          <div className="text-xs text-slate-500">Refreshing…</div>
        )}
      </div>

      {loadErr ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {loadErr}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No recent allergen changes logged yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2">
              {/* Initials pill */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {(row.staff_initials ?? "?").slice(0, 3).toUpperCase()}
              </div>

              {/* Main text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {row.item_name || "Unnamed item"}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      row.action === "create"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.action === "delete"
                        ? "bg-red-50 text-red-700"
                        : "bg-sky-50 text-sky-700"
                    }`}
                  >
                    {formatAction(row.action)}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {formatDateTimeUK(row.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
