"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import EditRoutineModal, {
  type RoutineDraft,
  type RoutineItemDraft,
} from "@/components/EditRoutineModal";

type RoutineRow = {
  id: string;
  name: string;
  active: boolean | null;
  last_used_at: string | null;
};

export default function RoutinesPage() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineDraft | null>(null);

  async function load() {
    setLoading(true);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("temp_routines")
        .select("id,name,active,last_used_at")
        .eq("org_id", orgId)
        .order("name", { ascending: true });

      if (error) throw error;
      setRows((data ?? []) as RoutineRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openAdd() {
    setEditing({ name: "", active: true, items: [] });
    setOpen(true);
  }

  async function openEdit(r: RoutineRow) {
    // fetch items for this routine
    const { data } = await supabase
      .from("temp_routine_items")
      .select("id,position,location,item,target_key")
      .eq("routine_id", r.id)
      .order("position", { ascending: true });

    const items: RoutineItemDraft[] =
      (data ?? []).map((it: any) => ({
        id: it.id,
        position: Number(it.position ?? 0),
        location: it.location ?? "",
        item: it.item ?? "",
        target_key: it.target_key ?? "cooked",
      })) || [];

    setEditing({
      id: r.id,
      name: r.name,
      active: !!r.active,
      items,
    });
    setOpen(true);
  }

  async function saveDraft(draft: RoutineDraft) {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) {
      alert("No organisation found.");
      return;
    }

    // Upsert routine
    let routineId = draft.id;
    if (routineId) {
      const { error } = await supabase
        .from("temp_routines")
        .update({ name: draft.name, active: draft.active })
        .eq("id", routineId)
        .eq("org_id", orgId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("temp_routines")
        .insert({ org_id: orgId, name: draft.name, active: draft.active })
        .select("id")
        .single();
      if (error) throw error;
      routineId = data.id as string;
    }

    // Load current items to detect deletions
    const { data: existing } = await supabase
      .from("temp_routine_items")
      .select("id")
      .eq("routine_id", routineId);

    const existingIds = new Set((existing ?? []).map((x: any) => x.id as string));
    const nextIds = new Set(draft.items.map((i) => i.id).filter(Boolean) as string[]);

    // Delete removed
    const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
    if (toDelete.length) {
      await supabase.from("temp_routine_items").delete().in("id", toDelete);
    }

    // Upsert all current
    if (draft.items.length) {
      const payload = draft.items.map((i) => ({
        id: i.id ?? undefined,
        routine_id: routineId,
        position: i.position,
        location: i.location,
        item: i.item,
        target_key: i.target_key,
      }));

      // Use upsert with primary key (id) if present
      await supabase.from("temp_routine_items").upsert(payload, { onConflict: "id" });
    }

    await load();
  }

  async function removeRoutine(id: string) {
    if (!confirm("Delete routine?")) return;
    await supabase.from("temp_routines").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Routines</h1>
        <div className="ml-auto">
          <button
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
            onClick={openAdd}
          >
            + Add routine
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Last used</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.active ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">
                    {r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-0 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => removeRoutine(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditRoutineModal
        open={open}
        initial={editing}
        onClose={() => setOpen(false)}
        onSave={saveDraft}
      />
    </div>
  );
}
