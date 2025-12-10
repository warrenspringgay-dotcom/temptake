"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  categories: string | null; // comma string
  notes: string | null;
  active: boolean | null;
};

type SupplierEdit = {
  id?: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  categories: string[];
  addCategory: string;
  notes: string;
  active: boolean;
};

/* -------------------- Helpers -------------------- */
function cls(...p: Array<string | false | undefined>) {
  return p.filter(Boolean).join(" ");
}

function parseCats(input: unknown): string[] {
  try {
    if (Array.isArray(input)) {
      return input
        .map((x) => (x == null ? "" : String(x)))
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (input == null) return [];
    if (typeof input === "object") return [];
    if (typeof input === "string") {
      const raw = input.trim();
      if (!raw) return [];
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

function catsToString(arr: string[]): string | null {
  const clean = Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
  return clean.length ? clean.join(", ") : null;
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ================================================= */
export default function SuppliersManager() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SupplierRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierEdit | null>(null);

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

  const [orgId, setOrgId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) {
        setRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,name,contact,phone,email,categories,notes,active")
        .eq("org_id", id)
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

  // permissions
  useEffect(() => {
    (async () => {
      try {
        const [id, userRes] = await Promise.all([
          getActiveOrgIdClient(),
          supabase.auth.getUser(),
        ]);
        const email = userRes.data.user?.email?.toLowerCase() ?? null;
        if (!id || !email) {
          setCanManage(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", id)
          .eq("email", email)
          .maybeSingle();

        if (error) {
          setCanManage(false);
          return;
        }

        const role = (data?.role ?? "").toLowerCase();
        setCanManage(
          role === "owner" || role === "manager" || role === "admin"
        );
      } catch {
        setCanManage(false);
      }
    })();
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
    if (!canManage) {
      alert("Only managers / owners can edit suppliers.");
      return;
    }
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

  function openAddModal() {
    if (!canManage) {
      alert("Only managers / owners can add suppliers.");
      return;
    }
    setAddOpen(true);
  }

  async function removeSupplier(id: string) {
    if (!canManage) {
      alert("Only managers / owners can delete suppliers.");
      return;
    }
    if (!confirm("Delete supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return alert(error.message);
    refresh();
  }

  function normalizeBeforeSave(s: SupplierEdit) {
    return {
      name: s.name.trim(),
      contact: s.contact.trim() || null,
      phone: s.phone.trim() || null,
      email: s.email.trim() || null,
      categories: catsToString(s.categories),
      notes: s.notes.trim() || null,
      active: !!s.active,
    };
  }

  async function saveEdit() {
    if (!editing) return;
    if (!canManage) {
      alert("Only managers / owners can edit suppliers.");
      return;
    }
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
    if (!canManage) {
      alert("Only managers / owners can add suppliers.");
      return;
    }
    const id = orgId ?? (await getActiveOrgIdClient());
    if (!id) return alert("No organisation found.");

    const payload = { org_id: id, ...normalizeBeforeSave(adding) };
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

  // typed toggleCat + addFreeCat
  function toggleCat(
    _state: SupplierEdit,
    setState: (updater: (s: SupplierEdit) => SupplierEdit) => void,
    cat: string
  ) {
    setState((s: SupplierEdit) => {
      const v = cat.trim();
      const has = s.categories.includes(v);
      return {
        ...s,
        categories: has
          ? s.categories.filter((c) => c !== v)
          : [...s.categories, v],
      };
    });
  }

  function addFreeCat(
    state: SupplierEdit,
    setState: (updater: (s: SupplierEdit) => SupplierEdit) => void
  ) {
    const v = state.addCategory.trim();
    if (!v) return;

    if (!state.categories.includes(v)) {
      setState((s: SupplierEdit) => ({
        ...s,
        categories: [...s.categories, v],
        addCategory: "",
      }));
    } else {
      setState((s: SupplierEdit) => ({ ...s, addCategory: "" }));
    }
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-900 shadow-xl backdrop-blur-sm sm:p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Suppliers</h1>
        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <input
            className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 sm:w-64"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className={cls(
              "shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-white",
              canManage
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "cursor-not-allowed bg-slate-400"
            )}
            onClick={openAddModal}
            disabled={!canManage}
          >
            + Add supplier
          </button>
        </div>
      </div>

      {/* Card grid (all breakpoints) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
          No suppliers yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const cats = parseCats(r.categories);
            const initials =
              (r.name || "?")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("") || "?";

            return (
              <div
                key={r.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-900 shadow-sm backdrop-blur-sm transition hover:shadow-md"
              >
                {/* Header */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {initials}
                    </div>
                    <div>
                      <button
                        className="text-sm font-semibold text-slate-900 hover:text-emerald-700"
                        onClick={() => openView(r)}
                      >
                        {r.name || "Unnamed supplier"}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                        <span
                          className={cls(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium border",
                            r.active
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          )}
                        >
                          {r.active ? "Active" : "Inactive"}
                        </span>
                        {cats.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {cats.length} category
                            {cats.length > 1 ? "ies" : "y"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ActionMenu
                    items={[
                      { label: "View", onClick: () => openView(r) },
                      ...(canManage
                        ? [
                            {
                              label: "Edit",
                              onClick: () => openEdit(r),
                            },
                            {
                              label: "Delete",
                              onClick: () => removeSupplier(r.id),
                              variant: "danger" as const,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                {/* Body */}
                <div className="space-y-1 text-xs text-slate-800">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Contact</span>
                    <span className="max-w-[70%] truncate text-right">
                      {r.contact || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Phone</span>
                    <span className="max-w-[70%] truncate text-right">
                      {r.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Email</span>
                    <span className="max-w-[70%] truncate text-right">
                      {r.email || "—"}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                <div className="mt-2 min-h-[28px]">
                  {cats.length ? (
                    <div className="flex flex-wrap gap-1">
                      {cats.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      No categories
                    </span>
                  )}
                </div>

                {/* Notes */}
                {r.notes && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                    {r.notes}
                  </div>
                )}

                {/* Footer shortcuts */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  {canManage && (
                    <button
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => openEdit(r)}
                    >
                      Edit details
                    </button>
                  )}
                  <button
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                    onClick={() => openView(r)}
                  >
                    View full record →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- VIEW ---------- */}
      {viewOpen && viewing && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setViewOpen(false)}
          >
            <div
              className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-t-3xl bg-slate-900 p-4 text-white">
                <div className="text-sm opacity-80">Supplier</div>
                <div className="text-xl font-semibold">{viewing.name}</div>
                <div className="opacity-80">
                  {viewing.active ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="space-y-3 p-4 text-sm">
                <div>
                  <span className="font-medium">Contact:</span>{" "}
                  {viewing.contact || "—"}
                </div>
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {viewing.phone || "—"}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {viewing.email || "—"}
                </div>
                <div>
                  <span className="font-medium">Categories:</span>{" "}
                  {parseCats(viewing.categories).join(", ") || "—"}
                </div>
                <div>
                  <span className="font-medium">Notes:</span>{" "}
                  {viewing.notes || "—"}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/80 p-3">
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setViewOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ---------- EDIT ---------- */}
      {editOpen && editing && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setEditOpen(false)}
          >
            <div
              className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">Edit supplier</div>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 text-sm">
                <input
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s!, name: e.target.value }))
                  }
                />
                <input
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  placeholder="Contact"
                  value={editing.contact}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s!, contact: e.target.value }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Phone"
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s!, phone: e.target.value }))
                    }
                  />
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Email"
                    value={editing.email}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s!, email: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs text-slate-500">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_CATEGORIES.map((c) => {
                      const active = editing.categories.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          className={cls(
                            "rounded-full border px-2 py-0.5 text-xs",
                            active
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          )}
                          onClick={() =>
                            toggleCat(editing, setEditing as any, c)
                          }
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                      placeholder="Add custom category"
                      value={editing.addCategory}
                      onChange={(e) =>
                        setEditing((s) => ({
                          ...s!,
                          addCategory: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        addFreeCat(editing, setEditing as any)
                      }
                    />
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
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
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800"
                        >
                          {c}
                          <button
                            type="button"
                            className="ml-1 rounded p-0.5 hover:bg-emerald-100"
                            onClick={() =>
                              setEditing((s) => ({
                                ...s!,
                                categories: s!.categories.filter(
                                  (x) => x !== c
                                ),
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
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  placeholder="Notes"
                  value={editing.notes}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s!, notes: e.target.value }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s!,
                        active: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setEditOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    onClick={saveEdit}
                    disabled={!canManage}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ---------- ADD ---------- */}
      {addOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setAddOpen(false)}
          >
            <div
              className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">Add supplier</div>
                <button
                  onClick={() => setAddOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 text-sm">
                <input
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  placeholder="Name"
                  value={adding.name}
                  onChange={(e) =>
                    setAdding((s) => ({ ...s, name: e.target.value }))
                  }
                />
                <input
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  placeholder="Contact"
                  value={adding.contact}
                  onChange={(e) =>
                    setAdding((s) => ({ ...s, contact: e.target.value }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Phone"
                    value={adding.phone}
                    onChange={(e) =>
                      setAdding((s) => ({ ...s, phone: e.target.value }))
                    }
                  />
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Email"
                    value={adding.email}
                    onChange={(e) =>
                      setAdding((s) => ({ ...s, email: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs text-slate-500">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_CATEGORIES.map((c) => {
                      const active = adding.categories.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          className={cls(
                            "rounded-full border px-2 py-0.5 text-xs",
                            active
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          )}
                          onClick={() =>
                            toggleCat(adding, setAdding as any, c)
                          }
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="h-9 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                      placeholder="Add custom category"
                      value={adding.addCategory}
                      onChange={(e) =>
                        setAdding((s) => ({
                          ...s,
                          addCategory: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        addFreeCat(adding, setAdding as any)
                      }
                    />
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => addFreeCat(adding, setAdding as any)}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  placeholder="Notes"
                  value={adding.notes}
                  onChange={(e) =>
                    setAdding((s) => ({ ...s, notes: e.target.value }))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={adding.active}
                    onChange={(e) =>
                      setAdding((s) => ({ ...s, active: e.target.checked }))
                    }
                  />
                  Active
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    onClick={saveAdd}
                    disabled={!adding.name.trim() || !canManage}
                  >
                    Add supplier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
