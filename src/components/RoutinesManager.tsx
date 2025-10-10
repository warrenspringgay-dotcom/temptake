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
import { Play } from "lucide-react";

type BuilderItem = { location: string; item: string; target_key: string };

export default function RoutinesManager() {
  const [rows, setRows] = useState<RoutineWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to load routines.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function addRow() {
    setItems((p) => [
      ...p,
      { location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" },
    ]);
  }

  function removeRow(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  function resetEditor() {
    setOpenId(null);
    setName("");
    setItems([
      { location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" },
    ]);
    setSaving(false);
  }

  async function openNew() {
    setOpenId("NEW");
    setName("");
    setItems([
      { location: "", item: "", target_key: TARGET_PRESETS[0]?.key ?? "chill" },
    ]);
  }

  function openEdit(r: RoutineWithItems) {
    setOpenId(r.id);
    setName(r.name);
    setItems(
      r.items
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((it) => ({
          location: it.location ?? "",
          item: it.item ?? "",
          target_key: it.target_key,
        }))
    );
  }

  /** Remove completely blank rows and trim everything else. */
  function normalizedItems(): BuilderItem[] {
    return items
      .map((it) => ({
        location: it.location.trim(),
        item: it.item.trim(),
        target_key: it.target_key,
      }))
      .filter((it) => it.location !== "" || it.item !== "");
  }

  async function saveNew() {
    if (saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Name required.");
      return;
    }
    const clean = normalizedItems();
    if (clean.length === 0) {
      alert("Add at least one entry (or fill an existing row).");
      return;
    }

    const payload: RoutineItemInput[] = clean.map((it, idx) => ({
      position: idx,
      location: it.location || null,
      item: it.item || null,
      target_key: it.target_key,
    }));

    setSaving(true);
    try {
      await createRoutine({ name: trimmedName, items: payload });
      resetEditor();
      await refresh();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to create routine.");
      setSaving(false);
    }
  }

  async function saveChanges() {
    if (!current || saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("Name required.");
      return;
    }
    const clean = normalizedItems();
    if (clean.length === 0) {
      alert("Add at least one entry (or fill an existing row).");
      return;
    }

    const payload: RoutineItemInput[] = clean.map((it, idx) => ({
      position: idx,
      location: it.location || null,
      item: it.item || null,
      target_key: it.target_key,
    }));

    setSaving(true);
    try {
      await updateRoutine(current.id, { name: trimmedName });
      await replaceRoutineItems(current.id, payload);
      resetEditor();
      await refresh();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to save changes.");
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this routine?")) return;
    try {
      await deleteRoutine(id);
      await refresh();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to delete routine.");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Routines</h1>
        <button
          onClick={openNew}
          className="ml-auto rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
        >
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
                  <td className="py-2 pr-3">{r.items.length}</td>
                  <td className="py-2 pr-3 text-gray-500">
                    {r.last_used_at
                      ? new Date(r.last_used_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/routines/${r.id}/run`}
                        className="inline-flex items-center rounded-xl bg-black px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                        title="Use routine"
                      >
                        <Play className="mr-1 h-3.5 w-3.5" /> Use
                      </Link>

                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center rounded-md border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50"
                        title="Edit"
                        aria-label={`Edit ${r.name}`}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => remove(r.id)}
                        className="inline-flex items-center rounded-md border-gray-300 px-2.5 py-1.5 text-xs hover:bg-gray-50"
                        title="Delete"
                        aria-label={`Delete ${r.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {openId && (
        <div
          className="fixed inset-0 z-[120] bg-black/30"
          onClick={() => setOpenId(null)}
        >
          <div
            className="absolute left-1/2 top-12 w-[min(920px,94vw)] -translate-x-1/2 overflow-hidden rounded-2xl border bg-white shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-base font-semibold">
                {openId === "NEW" ? "New routine" : "Edit routine"}
              </div>
              <button
                className="rounded-md p-2 hover:bg-gray-100"
                onClick={() => setOpenId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Name</label>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (openId === "NEW" ? !saving : !!current)) {
                      openId === "NEW" ? void saveNew() : void saveChanges();
                    }
                  }}
                />
              </div>

              <Collapse title="Entries">
                <div className="space-y-3">
                  {items.map((it, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-xs text-gray-500">
                          Location
                        </label>
                        <input
                          className="w-full rounded-xl border px-3 py-2"
                          value={it.location}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItems((p) => {
                              const c = p.slice();
                              c[i] = { ...c[i], location: v };
                              return c;
                            });
                          }}
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-xs text-gray-500">
                          Item
                        </label>
                        <input
                          className="w-full rounded-xl border px-3 py-2"
                          value={it.item}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItems((p) => {
                              const c = p.slice();
                              c[i] = { ...c[i], item: v };
                              return c;
                            });
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
                            const v = e.target.value;
                            setItems((p) => {
                              const c = p.slice();
                              c[i] = { ...c[i], target_key: v };
                              return c;
                            });
                          }}
                        >
                          {TARGET_PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-12 flex justify-end">
                        <button
                          className="rounded-xl border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                          onClick={() => removeRow(i)}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <button
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={addRow}
                  >
                    + Add entry
                  </button>
                </div>
              </Collapse>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setOpenId(null)}
              >
                Cancel
              </button>

              {openId === "NEW" ? (
                <button
                  className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                  onClick={saveNew}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save routine"}
                </button>
              ) : (
                <button
                  className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                  onClick={saveChanges}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tiny collapsible with chevron (like allergen page) */
function Collapse({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`sect-${title}`}
      >
        <span className="text-sm font-medium">{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div id={`sect-${title}`} className="border-t p-3">
          {children}
        </div>
      )}
    </div>
  );
}
