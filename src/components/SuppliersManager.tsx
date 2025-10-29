// src/components/SuppliersManager.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";

/* -------------------- Config -------------------- */
const PRESET_CATEGORIES = [
  "Dairy",
  "Meat",
  "Produce",
  "Bakery",
  "Frozen",
  "Dry Goods",
  "Packaging",
  "Cleaning",
] as const;

/* -------------------- Types -------------------- */
type SupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  /** Stored in DB as a single text field (comma-separated). */
  categories: string | null;
  notes: string | null;
  active: boolean | null;
};

/* For the editor we use an array of strings for categories,
   but serialize back to a simple comma-separated string. */
type SupplierEdit = {
  id?: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  categories: string[]; // UI shape
  addCategory: string;  // free-text entry box
  notes: string;
  active: boolean;
};

/* -------------------- Helpers -------------------- */
function cls(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

/** Robust parser: accept string, array, json, null -> string[] */
function parseCats(input: unknown): string[] {
  try {
    if (Array.isArray(input)) {
      return input
        .map((x) => (x == null ? "" : String(x)))
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (input == null) return [];
    if (typeof input === "object") {
      // If the DB column was jsonb and holds something like {list:[...]} or just ["a","b"]
      const asAny = input as any;
      if (Array.isArray(asAny)) return parseCats(asAny);
      if (Array.isArray(asAny?.list)) return parseCats(asAny.list);
      // Fallback to JSON string
      return [];
    }
    if (typeof input === "string") {
      const raw = input.trim();
      if (!raw) return [];
      // split on comma / semicolon / pipe
      return raw
        .split(/[;,|]/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/** Serialize back to comma-separated for a simple text column */
function catsToString(arr: string[]): string | null {
  const clean = Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
  return clean.length ? clean.join(", ") : null;
}

/* =================================================
   Component
================================================= */
export default function SuppliersManager() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // view / edit
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SupplierRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierEdit | null>(null);

  // add
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState<SupplierEdit>({
    name: "",
    contact: "",
    phone: "",
    email: "",
    categories: [],
    addCategory: "",
    notes: "",
    active: true,
  });

  async function refresh() {
    setLoading(true);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,name,contact,phone,email,categories,notes,active")
        .eq("org_id", orgId)
        .order("name");
      if (error) throw error;
      setRows((data ?? []) as SupplierRow[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load suppliers.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.contact, r.email, r.phone, r.categories, r.notes]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(term))
    );
  }, [q, rows]);

  function openView(r: SupplierRow) {
    setViewing(r);
    setViewOpen(true);
  }

  function openEdit(r: SupplierRow) {
    setEditing({
      id: r.id,
      name: r.name ?? "",
      contact: r.contact ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      categories: parseCats(r.categories),
      addCategory: "",
      notes: r.notes ?? "",
      active: !!r.active,
    });
    setEditOpen(true);
  }

  async function removeSupplier(id: string) {
    if (!confirm("Delete supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return alert(error.message);
    refresh();
  }

  /* -------------------- Save helpers -------------------- */
  function normalizeBeforeSave(s: SupplierEdit) {
    return {
      name: s.name.trim(),
      contact: s.contact.trim() || null,
      phone: s.phone.trim() || null,
      email: s.email.trim() || null,
      categories: catsToString(s.categories), // text column friendly
      notes: s.notes.trim() || null,
      active: !!s.active,
    };
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim()) return alert("Name is required.");

    const { error } = await supabase
      .from("suppliers")
      .update(normalizeBeforeSave(editing))
      .eq("id", editing.id);
    if (error) return alert(error.message);
    setEditOpen(false);
    setEditing(null);
    refresh();
  }

  async function saveAdd() {
    if (!adding.name.trim()) return alert("Name is required.");
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return alert("No organisation found.");

    const payload = { org_id: orgId, ...normalizeBeforeSave(adding) };
    const { error } = await supabase.from("suppliers").insert(payload);
    if (error) return alert(error.message);

    setAddOpen(false);
    setAdding({
      name: "",
      contact: "",
      phone: "",
      email: "",
      categories: [],
      addCategory: "",
      notes: "",
      active: true,
    });
    refresh();
  }

  /* -------------------- Category chip UI helpers -------------------- */
  function toggleCat(state: SupplierEdit, setState: (fn: any) => void, cat: string) {
    setState((s: SupplierEdit) => {
      const v = cat.trim();
      const has = s.categories.includes(v);
      return { ...s, categories: has ? s.categories.filter((c) => c !== v) : [...s.categories, v] };
    });
  }
  function addFreeCat(state: SupplierEdit, setState: (fn: any) => void) {
    const v = state.addCategory.trim();
    if (!v) return;
    if (!state.categories.includes(v)) {
      setState((s: SupplierEdit) => ({ ...s, categories: [...s.categories, v], addCategory: "" }));
    } else {
      setState((s: SupplierEdit) => ({ ...s, addCategory: "" }));
    }
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-6 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Suppliers</h1>
        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <input
            className="h-10 w-full rounded-xl border px-3 text-sm sm:w-64"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="shrink-0 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
            onClick={() => setAddOpen(true)}
          >
            + Add supplier
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Supplier</th>
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">Phone</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Categories</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  No suppliers yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const cats = parseCats(r.categories);
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3">
                      <button
                        className="text-blue-600 underline hover:text-blue-700"
                        onClick={() => openView(r)}
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="py-2 pr-3">{r.contact ?? "—"}</td>
                    <td className="py-2 pr-3">{r.phone ?? "—"}</td>
                    <td className="py-2 pr-3">{r.email ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {cats.length ? (
                        <div className="flex flex-wrap gap-1">
                          {cats.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.active ? "Yes" : "No"}</td>
                    <td className="py-2 pr-0 text-right">
                      <ActionMenu
                        items={[
                          { label: "View", onClick: () => openView(r) },
                          { label: "Edit", onClick: () => openEdit(r) },
                          {
                            label: "Delete",
                            onClick: () => removeSupplier(r.id),
                            variant: "danger",
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View card */}
      {viewOpen && viewing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-2xl border bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-2xl bg-slate-800 p-4 text-white">
              <div className="text-sm opacity-80">Supplier</div>
              <div className="text-xl font-semibold">{viewing.name}</div>
              <div className="opacity-80">{viewing.active ? "Active" : "Inactive"}</div>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <span className="font-medium">Contact:</span> {viewing.contact || "—"}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {viewing.phone || "—"}
              </div>
              <div>
                <span className="font-medium">Email:</span> {viewing.email || "—"}
              </div>
              <div>
                <span className="font-medium">Categories:</span>{" "}
                {parseCats(viewing.categories).join(", ") || "—"}
              </div>
              <div>
                <span className="font-medium">Notes:</span> {viewing.notes || "—"}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t p-3">
              <button
                className="rounded-md px-3 py-1.5 hover:bg-gray-100"
                onClick={() => setViewOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEditOpen(false)}>
          <div
            className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Edit supplier</div>
              <button onClick={() => setEditOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <input
                className="h-10 w-full rounded-xl border px-3"
                value={editing.name}
                onChange={(e) => setEditing((s) => ({ ...s!, name: e.target.value }))}
              />
              <input
                className="h-10 w-full rounded-xl border px-3"
                placeholder="Contact"
                value={editing.contact}
                onChange={(e) => setEditing((s) => ({ ...s!, contact: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Phone"
                  value={editing.phone}
                  onChange={(e) => setEditing((s) => ({ ...s!, phone: e.target.value }))}
                />
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Email"
                  value={editing.email}
                  onChange={(e) => setEditing((s) => ({ ...s!, email: e.target.value }))}
                />
              </div>

              {/* Categories picker */}
              <div>
                <div className="mb-1 text-xs text-gray-500">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CATEGORIES.map((c) => {
                    const active = editing.categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        className={cls(
                          "rounded-full border px-2 py-0.5 text-xs",
                          active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                        )}
                        onClick={() => toggleCat(editing, setEditing as any, c)}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="h-9 w-full rounded-xl border px-3 text-sm"
                    placeholder="Add custom category"
                    value={editing.addCategory}
                    onChange={(e) => setEditing((s) => ({ ...s!, addCategory: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addFreeCat(editing, setEditing as any)}
                  />
                  <button
                    type="button"
                    className="h-9 rounded-xl border px-3 text-sm hover:bg-gray-50"
                    onClick={() => addFreeCat(editing, setEditing as any)}
                  >
                    Add
                  </button>
                </div>

                {editing.categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {editing.categories.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                      >
                        {c}
                        <button
                          type="button"
                          className="ml-1 rounded p-0.5 hover:bg-gray-200"
                          onClick={() =>
                            setEditing((s) => ({
                              ...s!,
                              categories: s!.categories.filter((x) => x !== c),
                            }))
                          }
                          aria-label={`Remove ${c}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                className="min-h-[90px] w-full rounded-xl border px-3 py-2"
                placeholder="Notes"
                value={editing.notes}
                onChange={(e) => setEditing((s) => ({ ...s!, notes: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing((s) => ({ ...s!, active: e.target.checked }))}
                />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setEditOpen(false)}>
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
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setAddOpen(false)}>
          <div
            className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Add supplier</div>
              <button onClick={() => setAddOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <input
                className="h-10 w-full rounded-xl border px-3"
                placeholder="Name"
                value={adding.name}
                onChange={(e) => setAdding((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="h-10 w-full rounded-xl border px-3"
                placeholder="Contact"
                value={adding.contact}
                onChange={(e) => setAdding((s) => ({ ...s, contact: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Phone"
                  value={adding.phone}
                  onChange={(e) => setAdding((s) => ({ ...s, phone: e.target.value }))}
                />
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  placeholder="Email"
                  value={adding.email}
                  onChange={(e) => setAdding((s) => ({ ...s, email: e.target.value }))}
                />
              </div>

              {/* Categories picker */}
              <div>
                <div className="mb-1 text-xs text-gray-500">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CATEGORIES.map((c) => {
                    const active = adding.categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        className={cls(
                          "rounded-full border px-2 py-0.5 text-xs",
                          active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                        )}
                        onClick={() => toggleCat(adding, setAdding as any, c)}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="h-9 w-full rounded-xl border px-3 text-sm"
                    placeholder="Add custom category"
                    value={adding.addCategory}
                    onChange={(e) => setAdding((s) => ({ ...s, addCategory: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addFreeCat(adding, setAdding as any)}
                  />
                  <button
                    type="button"
                    className="h-9 rounded-xl border px-3 text-sm hover:bg-gray-50"
                    onClick={() => addFreeCat(adding, setAdding as any)}
                  >
                    Add
                  </button>
                </div>

                {adding.categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {adding.categories.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px]"
                      >
                        {c}
                        <button
                          type="button"
                          className="ml-1 rounded p-0.5 hover:bg-gray-200"
                          onClick={() =>
                            setAdding((s) => ({
                              ...s,
                              categories: s.categories.filter((x) => x !== c),
                            }))
                          }
                          aria-label={`Remove ${c}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                className="min-h-[90px] w-full rounded-xl border px-3 py-2"
                placeholder="Notes"
                value={adding.notes}
                onChange={(e) => setAdding((s) => ({ ...s, notes: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={adding.active}
                  onChange={(e) => setAdding((s) => ({ ...s, active: e.target.checked }))}
                />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  onClick={saveAdd}
                  disabled={!adding.name.trim()}
                >
                  Add supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
