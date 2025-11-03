// src/components/RoutinesClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_PRESETS } from "@/lib/temp-constants";

import EditRoutineModal, {
  type RoutineDraft,
  type RoutineItemDraft,
} from "@/components/EditRoutineModal";


type RoutineItem = {
  id: string;
  routine_id: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
};
type RoutineRow = {
  id: string;
  name: string;
  active: boolean | null;
  items: RoutineItem[];
  last_used_at?: string | null;
};

export default function RoutinesClient() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [item, setItem] = useState("");
  const [target, setTarget] = useState<string>(TARGET_PRESETS[0]?.key ?? "chill");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<RoutineRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineRow | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) { setRows([]); return; }

      const { data: routines, error: rErr } = await supabase
        .from("temp_routines")
        .select("id,name,active,last_used_at")
        .eq("org_id", orgId)
        .order("name");
      if (rErr) throw rErr;

      const ids = (routines ?? []).map((r) => r.id);
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
          position: Number(it.position ?? 0),
          location: it.location ?? null,
          item: it.item ?? null,
          target_key: it.target_key ?? "chill",
        });
        grouped.set(it.routine_id, arr);
      });

      setRows((routines ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        active: r.active ?? true,
        last_used_at: r.last_used_at ?? null,
        items: (grouped.get(r.id) ?? []).sort((a, b) => a.position - b.position),
      })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function add() {
    if (!name.trim()) return;
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return;

    const { data: created, error: cErr } = await supabase
      .from("temp_routines")
      .insert({ org_id: orgId, name: name.trim(), active: true })
      .select("id")
      .single();
    if (cErr) { alert(cErr.message); return; }

    if (location || item || target) {
      const { error: iErr } = await supabase
        .from("temp_routine_items")
        .insert({
          routine_id: created.id,
          position: 1,
          location: location || null,
          item: item || null,
          target_key: target,
        });
      if (iErr) { alert(iErr.message); return; }
    }

    setName(""); setLocation(""); setItem("");
    await refresh();
  }

  const openView  = (r: RoutineRow) => { setViewing(r); setViewOpen(true); };
  const openEdit  = (r: RoutineRow) => { setEditing(JSON.parse(JSON.stringify(r))); setEditOpen(true); };

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase
      .from("temp_routines")
      .update({ name: editing.name, active: editing.active ?? true })
      .eq("id", editing.id);
    if (error) return alert(error.message);

    await supabase.from("temp_routine_items").delete().eq("routine_id", editing.id);
    const inserts = editing.items.map((it, i) => ({
      routine_id: editing.id,
      position: it.position ?? i + 1,
      location: it.location ?? null,
      item: it.item ?? null,
      target_key: it.target_key,
    }));
    const { error: iErr } = await supabase.from("temp_routine_items").insert(inserts);
    if (iErr) return alert(iErr.message);

    setEditOpen(false);
    await refresh();
  }

  async function deleteRoutine(id: string) {
    if (!confirm("Delete routine?")) return;
    const { error } = await supabase.from("temp_routines").delete().eq("id", id);
    if (error) return alert(error.message);
    await refresh();
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-white p-4 shadow-sm">
      <h1 className="text-xl font-semibold">Temperature Routines</h1>

      {/* Quick add */}
      <div className="grid gap-3 sm:grid-cols-5">
        <input className="rounded-lg border px-3 py-2" placeholder="Routine name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded-lg border px-3 py-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="rounded-lg border px-3 py-2" placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} />
        <select className="rounded-lg border px-3 py-2" value={target} onChange={(e) => setTarget(e.target.value)}>
          {TARGET_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button onClick={add} className="rounded-lg bg-black px-3 py-2 text-white hover:bg-gray-900">Add</button>
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Items</th>
              <th className="py-2 pr-3">Last used</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">No routines</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t align-middle">
                <td className="py-2 pr-3">
                  {/* blue link exactly like team page */}
                  <button
                    className="text-blue-600 underline hover:text-blue-700"
                    onClick={() => openView(r)}
                    title="View routine"
                  >
                    {r.name}
                  </button>
                </td>
                <td className="py-2 pr-3">{r.items.length}</td>
                <td className="py-2 pr-3">{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}</td>
                <td className="py-2 pr-3">
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => openView(r)} aria-label="View">🔭</button>
                    <button className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => openEdit(r)} aria-label="Edit">✏️</button>
                    <button className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => deleteRoutine(r.id)} aria-label="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View modal */}
      {viewOpen && viewing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Routine · {viewing.name}</div>
              <div className="flex items-center gap-2">
                <a
                  href={`/dashboard?r=${encodeURIComponent(viewing.id)}`}
                  className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
                >
                  Use routine
                </a>
                <button onClick={() => setViewOpen(false)} className="rounded-md p-2 hover:bg-gray-100">✕</button>
              </div>
            </div>
            <ul className="divide-y">
              {viewing.items.map((it) => (
                <li key={it.id} className="py-2 text-sm">
                  <div className="font-medium">Step {it.position}</div>
                  <div className="text-gray-600">
                    {[it.location, it.item].filter(Boolean).join(" · ") || "—"} · target: <code>{it.target_key}</code>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEditOpen(false)}>
          <div className="mx-auto mt-16 w-full max-w-3xl rounded-2xl border bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Edit routine</div>
              <button onClick={() => setEditOpen(false)} className="rounded-md p-2 hover:bg-gray-100">✕</button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <input className="h-10 w-full rounded-xl border px-3" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {editing.items.map((it, i) => (
                <div key={it.id ?? i} className="grid gap-2 sm:grid-cols-3">
                  <input className="rounded-xl border px-3 py-2" placeholder="Location" value={it.location ?? ""} onChange={(e) => {
                    const copy = { ...editing, items: [...editing.items] };
                    copy.items[i] = { ...copy.items[i], location: e.target.value || null };
                    setEditing(copy);
                  }} />
                  <input className="rounded-xl border px-3 py-2" placeholder="Item" value={it.item ?? ""} onChange={(e) => {
                    const copy = { ...editing, items: [...editing.items] };
                    copy.items[i] = { ...copy.items[i], item: e.target.value || null };
                    setEditing(copy);
                  }} />
                  <select className="rounded-xl border px-3 py-2" value={it.target_key} onChange={(e) => {
                    const copy = { ...editing, items: [...editing.items] };
                    copy.items[i] = { ...copy.items[i], target_key: e.target.value };
                    setEditing(copy);
                  }}>
                    {TARGET_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
