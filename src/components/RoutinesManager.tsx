// src/app/(protected)/routines/RoutineManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_PRESETS } from "@/lib/temp-constants";
import ActionMenu from "@/components/ActionMenu";

type RoutineItem = {
  id?: string;
  routine_id?: string;
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

function cls(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

export default function RoutineManager() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [q, setQ] = useState(""); // search
  const [newName, setNewName] = useState(""); // quick add

  // view + edit modals
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<RoutineRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineRow | null>(null);

  // ================= Fetch routines =================
  async function refresh() {
    setLoading(true);
    try {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) {
        setRows([]);
        return;
      }

      const { data: routines, error: rErr } = await supabase
        .from("temp_routines")
        .select("id,name,active,last_used_at")
        .eq("org_id", id)
        .order("name");

      if (rErr) throw rErr;
      if (!routines?.length) {
        setRows([]);
        return;
      }

      const ids = routines.map((r) => r.id);
      const { data: items, error: iErr } = await supabase
        .from("temp_routine_items")
        .select("id,routine_id,position,location,item,target_key")
        .in("routine_id", ids);
      if (iErr) throw iErr;

      const grouped = new Map<string, RoutineItem[]>();
      (items ?? []).forEach((it) => {
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

      setRows(
        routines.map((r: any) => ({
          id: r.id,
          name: r.name,
          active: r.active ?? true,
          last_used_at: r.last_used_at ?? null,
          items: (grouped.get(r.id) ?? []).sort((a, b) => a.position - b.position),
        }))
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // ================= Filter =================
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, q]);

  // ================= Actions =================
  async function addQuick() {
    if (!newName.trim() || !orgId) return;
    const { data: created, error } = await supabase
      .from("temp_routines")
      .insert({ org_id: orgId, name: newName.trim(), active: true })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setNewName("");
    await refresh();

    const r = (
      await supabase
        .from("temp_routines")
        .select("id,name,active")
        .eq("id", created!.id)
        .single()
    ).data!;
    setEditing({ id: r.id, name: r.name, active: true, items: [] });
    setEditOpen(true);
  }

  function openView(r: RoutineRow) {
    setViewing(r);
    setViewOpen(true);
  }

  function openEdit(r: RoutineRow) {
    setEditing(JSON.parse(JSON.stringify(r)));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const { error: uErr } = await supabase
        .from("temp_routines")
        .update({ name: editing.name, active: editing.active ?? true })
        .eq("id", editing.id);
      if (uErr) throw uErr;

      await supabase.from("temp_routine_items").delete().eq("routine_id", editing.id);

      const inserts = editing.items.map((it, i) => ({
        routine_id: editing.id,
        position: it.position ?? i + 1,
        location: it.location ?? null,
        item: it.item ?? null,
        target_key: it.target_key,
      }));

      if (inserts.length) {
        const { error: iErr } = await supabase.from("temp_routine_items").insert(inserts);
        if (iErr) throw iErr;
      }

      setEditOpen(false);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Save failed.");
    }
  }

  async function removeRoutine(id: string) {
    if (!confirm("Delete routine?")) return;
    const { error } = await supabase.from("temp_routines").delete().eq("id", id);
    if (error) return alert(error.message);
    await refresh();
  }

  // ================= Render =================
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Routines</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            className="h-9 rounded-xl border px-3 text-sm"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Quick add */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="rounded-xl border px-3 py-2"
          placeholder="New routine name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
          onClick={addQuick}
        >
          Add
        </button>
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[55%]" />
            <col className="w-[12%]" />
            <col className="w-[33%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Items</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">
                    <button
                      className="text-blue-600 underline hover:text-blue-700"
                      title="Open"
                      onClick={() => openView(r)}
                    >
                      {r.name}
                    </button>
                  </td>

                  <td className="py-2 pr-3">{r.items.length}</td>

                  <td className="py-2 pr-3">
                    <div className="relative inline-block text-left">
                      <ActionMenu
                        items={[
                          { label: "View", onClick: () => openView(r) },
                          { label: "Edit", onClick: () => openEdit(r) },
                          {
                            label: "Use routine",
                            href: `/dashboard?run=${encodeURIComponent(r.id)}`,
                          },
                          {
                            label: "Delete",
                            onClick: () => removeRoutine(r.id),
                            variant: "danger",
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== View Card ===== */}
      {viewOpen && viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setViewOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-xl overflow-y-auto rounded-2xl border bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-800 px-4 py-3 text-white">
              <div className="text-sm opacity-80">Routine</div>
              <div className="text-xl font-semibold">{viewing.name}</div>
              <div className="opacity-80">
                {viewing.active ? "Active" : "Inactive"}
              </div>
            </div>

            <div className="p-4">
              {viewing.items.length ? (
                <ul className="divide-y">
                  {viewing.items.map((it) => (
                    <li
                      key={`${it.position}-${it.item}-${it.location}`}
                      className="py-2 text-sm"
                    >
                      <div className="font-medium">Step {it.position}</div>
                      <div className="text-gray-600">
                        {[it.location, it.item].filter(Boolean).join(" · ") ||
                          "—"}{" "}
                        · target: <code>{it.target_key}</code>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-600">
                  No items in this routine.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-gray-50 p-3">
              <a
                href={`/dashboard?run=${encodeURIComponent(viewing.id)}`}
                className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
              >
                Use routine
              </a>
              <button
                className="rounded-md bg-white px-3 py-1.5 text-sm"
                onClick={() => setViewOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Modal ===== */}
      {editOpen && editing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 overflow-y-auto"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-3xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Edit routine</div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-md p-2 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <input
                className="h-10 w-full rounded-xl border px-3"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {editing.items.map((it, i) => (
                <div
                  key={i}
                  className="grid gap-2 sm:grid-cols-[80px_1fr_1fr_1fr_auto]"
                >
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="#"
                    type="number"
                    value={it.position}
                    onChange={(e) => {
                      const copy = {
                        ...editing,
                        items: [...editing.items],
                      };
                      copy.items[i] = {
                        ...copy.items[i],
                        position: Number(e.target.value) || 0,
                      };
                      setEditing(copy);
                    }}
                  />
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="Location"
                    value={it.location ?? ""}
                    onChange={(e) => {
                      const copy = {
                        ...editing,
                        items: [...editing.items],
                      };
                      copy.items[i] = {
                        ...copy.items[i],
                        location: e.target.value || null,
                      };
                      setEditing(copy);
                    }}
                  />
                  <input
                    className="rounded-xl border px-3 py-2"
                    placeholder="Item"
                    value={it.item ?? ""}
                    onChange={(e) => {
                      const copy = {
                        ...editing,
                        items: [...editing.items],
                      };
                      copy.items[i] = {
                        ...copy.items[i],
                        item: e.target.value || null,
                      };
                      setEditing(copy);
                    }}
                  />
                  <select
                    className="rounded-xl border px-3 py-2"
                    value={it.target_key}
                    onChange={(e) => {
                      const copy = {
                        ...editing,
                        items: [...editing.items],
                      };
                      copy.items[i] = {
                        ...copy.items[i],
                        target_key: e.target.value,
                      };
                      setEditing(copy);
                    }}
                  >
                    {TARGET_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      const copy = {
                        ...editing,
                        items: editing.items.filter((_, idx) => idx !== i),
                      };
                      setEditing(copy);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                className="mt-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() =>
                  setEditing({
                    ...editing,
                    items: [
                      ...editing.items,
                      {
                        position:
                          (editing.items.at(-1)?.position ?? 0) + 1,
                        location: "",
                        item: "",
                        target_key: "chill",
                      },
                    ],
                  })
                }
              >
                + Add step
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
