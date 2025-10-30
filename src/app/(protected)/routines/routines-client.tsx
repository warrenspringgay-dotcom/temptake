"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import EditRoutineModal, {
  type RoutineDraft,
  type RoutineItemDraft,
} from "@/components/EditRoutineModal";

/* ---------- Types used locally ---------- */
type RoutineListRow = {
  id: string;
  name: string;
  active: boolean;
  items_count?: number;
};

export default function RoutinesClient() {
  const [rows, setRows] = useState<RoutineListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineDraft | null>(null);

  /* ---------- Load list ---------- */
  async function loadList() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        return;
      }

      // load routines
      const { data: routines, error } = await supabase
        .from("temp_routines")
        .select("id,name,active")
        .eq("org_id", orgId)
        .order("name", { ascending: true });

      if (error) throw error;

      // optional: count items (best-effort)
      const ids = (routines ?? []).map((r) => r.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: items } = await supabase
          .from("temp_routine_items")
          .select("routine_id", { count: "exact", head: false })
          .in("routine_id", ids);

        (items ?? []).forEach((r: any) => {
          const id = r.routine_id as string;
          counts[id] = (counts[id] ?? 0) + 1;
        });
      }

      setRows(
        (routines ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          active: !!r.active,
          items_count: counts[r.id] ?? undefined,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load routines.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  /* ---------- Open: create / edit ---------- */
  async function openCreate() {
    setEditing({
      name: "",
      active: true,
      items: [],
    });
    setOpen(true);
  }

  async function openEdit(id: string) {
    try {
      const { data: r, error } = await supabase
        .from("temp_routines")
        .select("id,name,active")
        .eq("id", id)
        .maybeSingle();

      if (error || !r) return;

      const { data: items } = await supabase
        .from("temp_routine_items")
        .select("id,position,location,item,target_key")
        .eq("routine_id", id)
        .order("position");

      const draft: RoutineDraft = {
        id: r.id,
        name: r.name ?? "",
        active: !!r.active,
        items:
          (items ?? []).map((it: any) => ({
            id: it.id,
            position: Number(it.position ?? 0),
            location: it.location ?? "",
            item: it.item ?? "",
            target_key: it.target_key ?? "chill",
          })) ?? [],
      };

      setEditing(draft);
      setOpen(true);
    } catch {
      // ignore
    }
  }

  /* ---------- Save from modal ---------- */
  async function saveDraft(d: RoutineDraft) {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) {
      alert("No organisation found.");
      return;
    }

    if (d.id) {
      // update + replace items for simplicity/robustness
      const { error: upErr } = await supabase
        .from("temp_routines")
        .update({ name: d.name.trim(), active: d.active })
        .eq("id", d.id)
        .eq("org_id", orgId);
      if (upErr) {
        alert(upErr.message);
        return;
      }

      // delete existing items then insert new
      await supabase.from("temp_routine_items").delete().eq("routine_id", d.id);
      if (d.items.length) {
        const payload = d.items
          .sort((a, b) => a.position - b.position)
          .map((it, i) => ({
            routine_id: d.id!,
            position: i + 1,
            location: it.location || null,
            item: it.item || null,
            target_key: it.target_key || "chill",
          }));
        const { error: insErr } = await supabase.from("temp_routine_items").insert(payload);
        if (insErr) {
          alert(insErr.message);
          return;
        }
      }
    } else {
      // create new + items
      const { data: r, error: insErr } = await supabase
        .from("temp_routines")
        .insert({
          org_id: orgId,
          name: d.name.trim(),
          active: d.active,
        })
        .select("id")
        .maybeSingle();

      if (insErr || !r) {
        alert(insErr?.message || "Failed to create routine");
        return;
      }

      if (d.items.length) {
        const payload = d.items
          .sort((a, b) => a.position - b.position)
          .map((it, i) => ({
            routine_id: r.id as string,
            position: i + 1,
            location: it.location || null,
            item: it.item || null,
            target_key: it.target_key || "chill",
          }));
        const { error: itemsErr } = await supabase.from("temp_routine_items").insert(payload);
        if (itemsErr) {
          alert(itemsErr.message);
          return;
        }
      }
    }

    setOpen(false);
    setEditing(null);
    await loadList();
  }

  /* ---------- Delete ---------- */
  async function remove(id: string) {
    if (!confirm("Delete this routine?")) return;
    try {
      await supabase.from("temp_routine_items").delete().eq("routine_id", id);
      const { error } = await supabase.from("temp_routines").delete().eq("id", id);
      if (error) throw error;
      await loadList();
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    }
  }

  /* ------------------ Render ------------------ */
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Routines</h1>
        <div className="ml-auto">
          <button
            onClick={openCreate}
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            + New routine
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Items</th>
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
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.active ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3">{r.items_count ?? "—"}</td>
                  <td className="py-2 pr-0 text-right space-x-2">
                    <button
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => openEdit(r.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      onClick={() => remove(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT / ADD MODAL */}
      <EditRoutineModal
        open={open}
        initial={editing}         // ✅ correct prop
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={saveDraft}        // ✅ receives (draft: RoutineDraft)
      />
    </div>
  );
}
