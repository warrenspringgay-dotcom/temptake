"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type RoutineItem = {
  id?: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
};
type RoutineRow = {
  id?: string;
  name: string;
  items: RoutineItem[];
  active?: boolean | null;
};

async function getOrgIdClient(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return null;

    const { data: prof } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", uid)
      .maybeSingle();
    if (prof?.org_id) return String(prof.org_id);

    const { data: uo } = await supabase
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", uid)
      .maybeSingle();
    return (uo?.org_id as string) ?? null;
  } catch {
    return null;
  }
}

export default function RoutinesClient() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<RoutineRow | null>(null);

  async function refresh() {
    setLoading(true);
    const orgId = await getOrgIdClient();

    let query = supabase
      .from("temp_routines")
      .select(
        "id,name,active,items:temp_routine_items(id,position,location,item,target_key)"
      )
      .order("name");
    if (orgId) query = query.eq("org_id", orgId);

    const { data, error } = await query;
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
    setRows(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        active: !!r.active,
        items: (r.items ?? []).map((it: any, i: number) => ({
          id: String(it.id),
          position: Number(it.position ?? i),
          location: it.location ?? null,
          item: it.item ?? null,
          target_key: it.target_key ?? "chill",
        })),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveRoutine(r: RoutineRow) {
    const org_id = await getOrgIdClient();
    if (!r.name.trim()) throw new Error("Name required");

    if (r.id) {
      const { error: e1 } = await supabase
        .from("routines")
        .update({ name: r.name, active: true })
        .eq("id", r.id);
      if (e1) throw e1;

      await supabase.from("routine_items").delete().eq("routine_id", r.id);
      if (r.items.length) {
        const toInsert = r.items.map((it, i) => ({
          routine_id: r.id,
          position: i,
          location: it.location,
          item: it.item,
          target_key: it.target_key,
        }));
        const { error: e2 } = await supabase
          .from("routine_items")
          .insert(toInsert);
        if (e2) throw e2;
      }
    } else {
      const { data: created, error } = await supabase
        .from("routines")
        .insert({ name: r.name, org_id, active: true })
        .select("id")
        .single();
      if (error) throw error;

      if (r.items.length) {
        const toInsert = r.items.map((it, i) => ({
          routine_id: created!.id,
          position: i,
          location: it.location,
          item: it.item,
          target_key: it.target_key,
        }));
        const { error: e2 } = await supabase
          .from("routine_items")
          .insert(toInsert);
        if (e2) throw e2;
      }
    }
  }

  async function removeRoutine(id: string) {
    await supabase.from("routine_items").delete().eq("routine_id", id);
    await supabase.from("routines").delete().eq("id", id);
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Routines</h1>
        <button
          className="rounded bg-black px-3 py-1 text-sm text-white hover:bg-gray-900"
          onClick={() =>
            setModal({
              name: "",
              items: [{ position: 0, location: "", item: "", target_key: "chill" }],
            })
          }
        >
          + Add routine
        </button>
      </div>

      <div className="flex items-center justify-between">
        <input
          className="w-64 rounded border px-3 py-2 text-sm"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

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
            {loading ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            ) : (
              rows
                .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
                .map((r) => (
                  <tr key={r.id} className="border-t align-middle">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.items.length}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => setModal(r)}
                          title="View / Edit"
                        >
                          ✏️ View / Edit
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={async () => {
                            if (!confirm("Delete routine?")) return;
                            await removeRoutine(r.id!);
                            refresh();
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="w-full max-w-2xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">
                {modal.id ? "Edit routine" : "Add routine"}
              </div>
              <button className="rounded p-2 hover:bg-gray-100" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Name</label>
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                {(modal.items ?? []).map((it, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-3">
                    <input
                      className="rounded border px-3 py-2"
                      placeholder="Location"
                      value={it.location ?? ""}
                      onChange={(e) => {
                        const items = modal.items.slice();
                        items[i] = { ...items[i], location: e.target.value };
                        setModal({ ...modal, items });
                      }}
                    />
                    <input
                      className="rounded border px-3 py-2"
                      placeholder="Item"
                      value={it.item ?? ""}
                      onChange={(e) => {
                        const items = modal.items.slice();
                        items[i] = { ...items[i], item: e.target.value };
                        setModal({ ...modal, items });
                      }}
                    />
                    <select
                      className="rounded border px-3 py-2"
                      value={it.target_key}
                      onChange={(e) => {
                        const items = modal.items.slice();
                        items[i] = { ...items[i], target_key: e.target.value };
                        setModal({ ...modal, items });
                      }}
                    >
                      <option value="chill">Chilled (0–8 °C)</option>
                      <option value="hot">Hot (≥63 °C)</option>
                      <option value="freeze">Frozen (≤−18 °C)</option>
                    </select>
                  </div>
                ))}
              </div>

              <button
                className="w-fit rounded border px-3 py-1 text-sm hover:bg-gray-50"
                onClick={() =>
                  setModal({
                    ...modal,
                    items: [
                      ...modal.items,
                      { position: modal.items.length, location: "", item: "", target_key: "chill" },
                    ],
                  })
                }
              >
                + Add item
              </button>

              <div className="flex justify-end gap-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  onClick={async () => {
                    try {
                      await saveRoutine(modal);
                      setModal(null);
                      refresh();
                    } catch (e: any) {
                      alert(e?.message ?? "Save failed");
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
