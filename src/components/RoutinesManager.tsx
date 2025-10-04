"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type EditState =
  | { mode: "new"; name: string; items: RoutineItemInput[] }
  | { mode: "edit"; id: string; name: string; items: RoutineItemInput[] };

function cls(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

export default function RoutinesManager() {
  const [rows, setRows] = useState<RoutineWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  /* -------------------- data -------------------- */
  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listRoutines();
      setRows(r);
    } catch (e: any) {
      setErr(e?.message || "Failed to load routines");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  /* -------------------- helpers -------------------- */
  const targets = useMemo(
    () => TARGET_PRESETS.map((p) => ({ value: p.key, label: p.label })),
    []
  );

  function newBlankItem(): RoutineItemInput {
    return { location: "", item: "", target_key: targets[0]?.value ?? "chill" };
    // you can default the target to anything you like
  }

  function openNewModal() {
    setEdit({ mode: "new", name: "", items: [newBlankItem()] });
    setModalOpen(true);
  }

  function openEditModal(r: RoutineWithItems) {
    setEdit({
      mode: "edit",
      id: r.id,
      name: r.name,
      items: r.items
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((it) => ({
          id: it.id,
          position: it.position,
          location: it.location ?? "",
          item: it.item ?? "",
          target_key: it.target_key,
        })),
    });
    setModalOpen(true);
  }

  function addItemRow() {
    if (!edit) return;
    setEdit({
      ...edit,
      items: [...edit.items, newBlankItem()],
    });
  }

  function removeItemRow(idx: number) {
    if (!edit) return;
    const next = edit.items.slice();
    next.splice(idx, 1);
    setEdit({ ...edit, items: next });
  }

  function move(idx: number, dir: -1 | 1) {
    if (!edit) return;
    const next = edit.items.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setEdit({ ...edit, items: next });
  }

  async function duplicateRoutine(r: RoutineWithItems) {
    setSaving(true);
    try {
      await createRoutine({
        name: `${r.name} (copy)`,
        items: r.items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((it) => ({
            position: it.position,
            location: it.location,
            item: it.item,
            target_key: it.target_key,
          })),
      });
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to duplicate routine");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: RoutineWithItems, checked: boolean) {
    try {
      await updateRoutine(r.id, { active: checked });
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to update routine");
    }
  }

  async function saveModal() {
    if (!edit) return;
    if (!edit.name.trim()) {
      alert("Please give your routine a name.");
      return;
    }
    if (edit.items.length === 0) {
      alert("Add at least one entry to the routine.");
      return;
    }

    setSaving(true);
    try {
      const items = edit.items.map((it, i) => ({
        position: i,
        location: (it.location ?? "").trim() || null,
        item: (it.item ?? "").trim() || null,
        target_key: it.target_key,
      }));

      if (edit.mode === "new") {
        await createRoutine({
          name: edit.name.trim(),
          items,
        });
      } else {
        // rename (if changed)
        await updateRoutine(edit.id, { name: edit.name.trim() });
        // replace items
        await replaceRoutineItems(edit.id, items);
      }

      setModalOpen(false);
      setEdit(null);
      await refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to save routine");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Routine manager</h1>
        <button
          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
          onClick={openNewModal}
        >
          New routine
        </button>
      </div>

      {err ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
          {err}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Entries</th>
              <th className="py-2 pr-3">Last used</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No routines yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.items.length}</td>
                  <td className="py-2 pr-3">
                    {r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => toggleActive(r, e.target.checked)}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl border px-2 py-1 hover:bg-gray-50"
                        onClick={() => openEditModal(r)}
                      >
                        Edit
                      </button>
                      <button
                        disabled={saving}
                        className={cls(
                          "rounded-xl border px-2 py-1",
                          saving ? "opacity-50" : "hover:bg-gray-50"
                        )}
                        onClick={() => duplicateRoutine(r)}
                      >
                        Duplicate
                      </button>
                      <button
                        className="rounded-xl border px-2 py-1 hover:bg-gray-50"
                        onClick={async () => {
                          if (!confirm(`Delete "${r.name}"?`)) return;
                          await deleteRoutine(r.id);
                          refresh();
                        }}
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

      {/* Modal */}
      {modalOpen && edit && (
        <div
          className="fixed inset-0 z-[200] bg-black/30"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 top-16 w-[min(900px,92vw)] -translate-x-1/2 rounded-xl border bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-base font-semibold">
                {edit.mode === "new" ? "New routine" : "Edit routine"}
              </div>
              <button
                className="rounded-md p-2 hover:bg-gray-100"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto px-4 py-4">
              <div className="mb-4">
                <label className="mb-1 block text-xs text-gray-500">
                  Routine name
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder="e.g., Morning fridges"
                />
              </div>

              <div className="mb-2 text-sm font-medium">Entries</div>

              <div className="space-y-3">
                {edit.items.map((it, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-12"
                  >
                    {/* Reorder controls */}
                    <div className="flex items-center gap-2 sm:col-span-12">
                      <button
                        type="button"
                        className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <div className="text-xs text-gray-500 ml-2">Row {i + 1}</div>
                      <div className="ml-auto">
                        <button
                          type="button"
                          className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => removeItemRow(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="mb-1 block text-xs text-gray-500">
                        Location
                      </label>
                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="e.g., Kitchen"
                        value={it.location ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = edit.items.slice();
                          next[i] = { ...next[i], location: v };
                          setEdit({ ...edit, items: next });
                        }}
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="mb-1 block text-xs text-gray-500">
                        Item
                      </label>
                      <input
                        className="w-full rounded-xl border px-3 py-2"
                        placeholder="e.g., Chicken curry"
                        value={it.item ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = edit.items.slice();
                          next[i] = { ...next[i], item: v };
                          setEdit({ ...edit, items: next });
                        }}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-xs text-gray-500">
                        Target
                      </label>
                      <select
                        className="w-full rounded-xl border px-3 py-2"
                        value={it.target_key}
                        onChange={(e) => {
                          const next = edit.items.slice();
                          next[i] = { ...next[i], target_key: e.target.value };
                          setEdit({ ...edit, items: next });
                        }}
                      >
                        {targets.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  + Add entry
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className={cls(
                  "rounded-xl px-3 py-2 text-sm font-medium text-white",
                  saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
                )}
                onClick={saveModal}
              >
                {saving ? "Saving…" : "Save routine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
