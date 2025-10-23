"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

export type RoutineItem = {
  id: string;
  routine_id: string;
  position: number | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
};

export type RoutineRow = {
  id: string;
  name: string;
  active: boolean | null;
  items: RoutineItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (r: RoutineRow) => void;
};

export default function RoutinePickerModal({ open, onClose, onPick }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const orgId = await getActiveOrgIdClient();
        if (!orgId) { setRows([]); return; }

        const { data: routines, error: rErr } = await supabase
          .from("temp_routines")
          .select("id,name,active")
          .eq("org_id", orgId)
          .order("name", { ascending: true });

        if (rErr) throw rErr;
        const ids = (routines ?? []).map(r => r.id);
        if (!ids.length) { setRows([]); return; }

        const { data: items, error: iErr } = await supabase
          .from("temp_routine_items")
          .select("id,routine_id,position,location,item,target_key")
          .in("routine_id", ids);

        if (iErr) throw iErr;

        const grouped = new Map<string, RoutineItem[]>();
        (items ?? []).forEach((it: any) => {
          const arr = grouped.get(it.routine_id) ?? [];
          arr.push({
            id: it.id, routine_id: it.routine_id,
            position: it.position ?? 0,
            location: it.location ?? null,
            item: it.item ?? null,
            target_key: it.target_key ?? "chill",
          });
          grouped.set(it.routine_id, arr);
        });

        setRows((routines ?? []).map(r => ({
          id: r.id,
          name: r.name,
          active: r.active ?? true,
          items: (grouped.get(r.id) ?? []).sort((a,b)=>(a.position??0)-(b.position??0)),
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(term));
  }, [rows, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-white p-4"
           onClick={(e)=>e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Use routine</div>
          <button className="rounded-md p-2 hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search routines…"
          className="mb-3 w-full rounded-xl border px-3 py-2"
        />
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No routines. Tip: create one in <a className="text-blue-600 underline" href="/routines">Routines</a>.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map(r => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.items.length} items</div>
                </div>
                <button
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  onClick={()=>onPick(r)}
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
