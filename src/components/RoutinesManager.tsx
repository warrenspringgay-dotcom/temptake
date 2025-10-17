// src/components/RoutinesManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */
type Routine = {
  id: string;
  name: string | null;
  created_by: string | null;
  location: string | null;
  created_at?: string | null;
};

type RoutineRow = Routine & { itemsCount: number };

/* =========================
   Data access
========================= */
async function fetchRoutines(): Promise<RoutineRow[]> {
  // try to pull counts with a join; if the FK is named differently
  // we’ll fallback to a 2nd query for counts.
  const { data, error } = await supabase
    .from("temp_routines")
    .select("id,name,created_by,location,created_at");

  if (error) throw new Error(error.message);

  const routines: Routine[] = (data ?? []) as Routine[];

  if (routines.length === 0) return [];

  // Count items per routine
  const ids = routines.map((r) => r.id);
  const { data: countsData, error: countsErr } = await supabase
    .from("temp_routine_items")
    .select("routine_id, id");

  if (countsErr) {
    // fallback: zero counts
    return routines
      .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
      .map((r) => ({ ...r, itemsCount: 0 }));
  }

  const map = new Map<string, number>();
  (countsData ?? []).forEach((row: any) => {
    const rid = row.routine_id as string;
    map.set(rid, (map.get(rid) ?? 0) + 1);
  });

  return routines
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
    .map((r) => ({ ...r, itemsCount: map.get(r.id) ?? 0 }));
}

async function insertRoutine(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const { error } = await supabase.from("temp_routines").insert({ name: clean });
  if (error) throw new Error(error.message);
}

async function deleteRoutine(id: string) {
  const { error } = await supabase.from("temp_routines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* =========================
   Component
========================= */
export default function RoutinesManager() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  async function reload() {
    try {
      setErrorMsg(null);
      setRows(await fetchRoutines());
    } catch (e: any) {
      console.error("Routines load error:", e);
      setErrorMsg(e?.message ?? "Failed to load routines (check RLS policies).");
      setRows([]);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.name ?? "").toLowerCase().includes(q));
  }, [rows, query]);

  async function handleAdd() {
    const nm = newName.trim();
    if (!nm) return;
    setSaving(true);
    try {
      await insertRoutine(nm);
      setNewName("");
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed to create routine");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this routine?")) return;
    try {
      await deleteRoutine(id);
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete routine");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[18px] font-semibold">Routines</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-9 w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMsg}
        </div>
      ) : null}

      {/* Add new routine */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New routine name"
            className="h-9 w-full max-w-xl rounded-xl border border-gray-200 px-3 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            className="h-9 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t align-middle">
                    <td className="py-2 pr-3">{r.name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.itemsCount}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        {/* put “edit items” flow here later */}
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    No routines yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
