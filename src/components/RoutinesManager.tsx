// src/components/RoutinesManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listRoutines,
  createRoutine,
  replaceRoutineItems,
  updateRoutine,
  deleteRoutine,
  type RoutineWithItems,
  type RoutineItemInput,
} from "@/app/actions/routines";
import { TARGET_PRESETS } from "@/lib/temp-constants";
import Chevron from "./ui/Chevron";

type BuilderItem = { location: string; item: string; target_key: string };

export default function RoutinesManager() {
  const [rows, setRows] = useState<RoutineWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<BuilderItem[]>([
    { location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" },
  ]);
  const current = useMemo(
    () => rows.find((r) => r.id === openId) || null,
    [rows, openId]
  );

  async function refresh() {
    setLoading(true);
    try {
      const r = await listRoutines();
      setRows(r);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  function addRow() {
    setItems((p) => [...p, { location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" }]);
  }
  function removeRow(i: number) {
    setItems((p) => p.filter((_, idx) => idx !== i));
  }

  async function openNew() {
    setOpenId("NEW");
    setName("");
    setItems([{ location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" }]);
  }
  function openEdit(r: RoutineWithItems) {
    setOpenId(r.id);
    setName(r.name);
    setItems(
      r.items
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((it) => ({ location: it.location ?? "", item: it.item ?? "", target_key: it.target_key }))
    );
  }

  async function saveNew() {
    if (!name.trim()) { alert("Name required."); return; }
    const payload: RoutineItemInput[] = items.map((it, idx) => ({
      position: idx,
      location: it.location || null,
      item: it.item || null,
      target_key: it.target_key,
    }));
    const created = await createRoutine({ name: name.trim(), items: payload });
    setOpenId(null);
    await refresh();
  }

  async function saveChanges() {
    if (!current) return;
    if (!name.trim()) { alert("Name required."); return; }
    await updateRoutine(current.id, { name: name.trim() });
    const payload: RoutineItemInput[] = items.map((it, idx) => ({
      position: idx,
      location: it.location || null,
      item: it.item || null,
      target_key: it.target_key,
    }));
    await replaceRoutineItems(current.id, payload);
    setOpenId(null);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this routine?")) return;
    await deleteRoutine(id);
    await refresh();
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Routines</h1>
        <button onClick={openNew} className="ml-auto rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
          + New routine
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Entries</th>
              <th className="py-2 pr-3">Last used</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-gray-500">No routines yet.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-3">{r.name}</td>
                <td className="py-2 pr-3">{r.items.length}</td>
                <td className="py-2 pr-3 text-gray-500">{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}</td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/routines/${r.id}/run`} className="rounded-xl border px-2 py-1 hover:bg-gray-50 text-xs">
                      Use
                    </Link>
                    <button onClick={() => openEdit(r)} className="rounded-xl border px-2 py-1 hover:bg-gray-50 text-xs">
                      Edit
                    </button>
                    <button onClick={() => remove(r.id)} className="rounded-xl border px-2 py-1 hover:bg-gray-50 text-xs">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {openId && (
        <div className="fixed inset-0 z-[120] bg-black/30" onClick={() => setOpenId(null)}>
          <div className="absolute left-1/2 top-12 w-[min(920px,94vw)] -translate-x-1/2 overflow-hidden rounded-xl border bg-white shadow-sm" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-base font-semibold">
                {openId === "NEW" ? "New routine" : "Edit routine"}
              </div>
              <button className="rounded-md p-2 hover:bg-gray-100" onClick={()=>setOpenId(null)}>✕</button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Name</label>
                <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
              </div>

              <Collapse title="Entries">
                <div className="space-y-3">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-12">
                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-xs text-gray-500">Location</label>
                        <input className="w-full rounded-xl border px-3 py-2" value={it.location} onChange={(e)=>{
                          const v = e.target.value;
                          setItems(p => { const c = p.slice(); c[i] = { ...c[i], location: v }; return c; });
                        }} />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-xs text-gray-500">Item</label>
                        <input className="w-full rounded-xl border px-3 py-2" value={it.item} onChange={(e)=>{
                          const v = e.target.value;
                          setItems(p => { const c = p.slice(); c[i] = { ...c[i], item: v }; return c; });
                        }} />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs text-gray-500">Target</label>
                        <select className="w-full rounded-xl border px-3 py-2" value={it.target_key} onChange={(e)=>{
                          const v = e.target.value;
                          setItems(p => { const c = p.slice(); c[i] = { ...c[i], target_key: v }; return c; });
                        }}>
                          {TARGET_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-12 flex justify-end">
                        <button className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50" onClick={()=>removeRow(i)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={addRow}>
                    + Add entry
                  </button>
                </div>
              </Collapse>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" onClick={()=>setOpenId(null)}>Cancel</button>
              {openId === "NEW" ? (
                <button className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900" onClick={saveNew}>Save routine</button>
              ) : (
                <button className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900" onClick={saveChanges}>Save changes</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tiny collapsible with chevron (like allergen page) */
function Collapse({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="border-t p-3">{children}</div>}
    </div>
  );
}
