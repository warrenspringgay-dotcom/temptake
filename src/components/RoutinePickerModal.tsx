// src/components/RoutinePickerModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export type RoutineItem = {
  id: string;
  routine_id: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
};

export type RoutineRow = {
  id: string;
  name: string;
  active: boolean | null;
  last_used_at: string | null;
  items: RoutineItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (r: RoutineRow) => void;
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function RoutinePickerModal({ open, onClose, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) {
          setRows([]);
          return;
        }

        // 1) fetch routines for this org
        const { data: routines, error: rErr } = await supabase
          .from("temp_routines")
          .select("id,name,active,last_used_at")
          .eq("org_id", orgId)
          .order("name", { ascending: true });

        if (rErr) throw rErr;
        const ids = (routines ?? []).map((r: any) => r.id);
        if (ids.length === 0) {
          setRows([]);
          return;
        }

        // 2) fetch items for those routines
        const { data: items, error: iErr } = await supabase
          .from("temp_routine_items")
          .select("id,routine_id,position,location,item,target_key")
          .in("routine_id", ids);

        if (iErr) throw iErr;

        const grouped = new Map<string, RoutineItem[]>();
        (items ?? []).forEach((it: any) => {
          const arr = grouped.get(it.routine_id) ?? [];
          arr.push({
            id: it.id,
            routine_id: it.routine_id,
            position: Number(it.position ?? 0),
            location: it.location ?? null,
            item: it.item ?? null,
            target_key: it.target_key ?? "chill",
          });
          grouped.set(it.routine_id, arr);
        });

        const finalRows: RoutineRow[] = (routines ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          active: r.active ?? true,
          last_used_at: r.last_used_at ?? null,
          items: (grouped.get(r.id) ?? []).sort((a, b) => a.position - b.position),
        }));

        setRows(finalRows);
      } catch (e: any) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [q, rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Use routine</div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-gray-100">✕</button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search routines..."
          className="mb-3 h-10 w-full rounded-xl border px-3"
        />

        <div className="max-h-[50vh] overflow-auto">
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No routines
              <div className="mt-1 text-xs">
                Tip: create one in{" "}
                <a className="text-blue-600 underline" href="/routines">
                  Routines
                </a>.
              </div>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const first = r.items[0];
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-blue-700 underline">
                        {/* name is a link opening the routine details page */}
                        <a href={`/routines#${encodeURIComponent(r.id)}`}>{r.name}</a>
                      </div>
                      <div className="truncate text-xs text-gray-600">
                        {first
                          ? [`Step 1:`, first.location, first.item]
                              .filter(Boolean)
                              .join(" · ")
                          : "No steps"}
                      </div>
                    </div>
                    <button
                      onClick={() => onApply(r)}
                      className={cls(
                        "shrink-0 rounded-lg px-3 py-1.5 text-sm text-white",
                        r.items.length ? "bg-black hover:bg-gray-900" : "bg-gray-400 cursor-not-allowed"
                      )}
                      disabled={!r.items.length}
                      title={r.items.length ? "Apply this routine" : "No steps to apply"}
                    >
                      Apply
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
