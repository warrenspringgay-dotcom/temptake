"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseBrowser";
import ActionMenu from "@/components/ActionMenu";
import { useActiveLocation } from "@/hooks/useActiveLocation";

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
  categories: string[] | string | null;
  notes: string | null;
  active: boolean | null;
  location_id?: string | null;
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

      if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed
              .map((x) => (x == null ? "" : String(x)))
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } catch {
          // fall through
        }
      }

      if (raw.startsWith("{") && raw.endsWith("}")) {
        const inner = raw.slice(1, -1).trim();
        if (!inner) return [];

        const out: string[] = [];
        let cur = "";
        let inQuotes = false;

        for (let i = 0; i < inner.length; i++) {
          const ch = inner[i];
          if (ch === '"') {
            const prev = inner[i - 1];
            if (prev !== "\\") inQuotes = !inQuotes;
            cur += ch;
            continue;
          }

          if (ch === "," && !inQuotes) {
            const v = cur.trim();
            if (v) out.push(v);
            cur = "";
            continue;
          }
          cur += ch;
        }

        const last = cur.trim();
        if (last) out.push(last);

        return out
          .map((s) => s.trim())
          .map((s) => {
            if (s.startsWith('"') && s.endsWith('"')) {
              return s.slice(1, -1).replace(/\\"/g, '"').trim();
            }
            return s;
          })
          .filter(Boolean);
      }

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

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function isMissingLocationColumnError(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("location_id") &&
    (msg.includes("does not exist") ||
      msg.includes("column") ||
      msg.includes("schema cache"))
  );
}

function toggleCatNullable(
  setState: React.Dispatch<React.SetStateAction<SupplierEdit | null>>,
  cat: string
) {
  setState((prev) => {
    if (!prev) return prev;

    const v = cat.trim();
    const has = prev.categories.includes(v);

    return {
      ...prev,
      categories: has
        ? prev.categories.filter((c) => c !== v)
        : [...prev.categories, v],
    };
  });
}

function addFreeCatNullable(
  state: SupplierEdit | null,
  setState: React.Dispatch<React.SetStateAction<SupplierEdit | null>>
) {
  const v = state?.addCategory.trim() ?? "";
  if (!v) return;

  if (!state?.categories.includes(v)) {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: [...prev.categories, v],
        addCategory: "",
      };
    });
  } else {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        addCategory: "",
      };
    });
  }
}

function toggleCatNonNull(
  setState: React.Dispatch<React.SetStateAction<SupplierEdit>>,
  cat: string
) {
  setState((prev) => {
    const v = cat.trim();
    const has = prev.categories.includes(v);

    return {
      ...prev,
      categories: has
        ? prev.categories.filter((c) => c !== v)
        : [...prev.categories, v],
    };
  });
}

function addFreeCatNonNull(
  state: SupplierEdit,
  setState: React.Dispatch<React.SetStateAction<SupplierEdit>>
) {
  const v = state.addCategory.trim();
  if (!v) return;

  if (!state.categories.includes(v)) {
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, v],
      addCategory: "",
    }));
  } else {
    setState((prev) => ({
      ...prev,
      addCategory: "",
    }));
  }
}

/* ================================================= */
export default function SuppliersManager() {
  const {
    orgId,
    locationId,
    loading: activeLocationLoading,
  } = useActiveLocation();

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

  const [canManage, setCanManage] = useState(false);

  async function refresh() {
    if (!orgId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let data: any[] | null = null;

      if (locationId) {
        const { data: d1, error: e1 } = await supabase
          .from("suppliers")
          .select("id,name,contact,phone,email,categories,notes,active,location_id")
          .eq("org_id", orgId)
          .or(`location_id.eq.${locationId},location_id.is.null`)
          .order("name");

        if (!e1) {
          data = d1 ?? [];
        } else if (!isMissingLocationColumnError(e1)) {
          throw e1;
        }
      }

      if (data === null) {
        const { data: d2, error: e2 } = await supabase
          .from("suppliers")
          .select("id,name,contact,phone,email,categories,notes,active")
          .eq("org_id", orgId)
          .order("name");

        if (e2) throw e2;
        data = d2 ?? [];
      }

      setRows(data as SupplierRow[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load suppliers.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeLocationLoading) return;
    void refresh();
  }, [activeLocationLoading, orgId, locationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      if (activeLocationLoading) return;
      if (!orgId) {
        if (!cancelled) setCanManage(false);
        return;
      }

      try {
        const userRes = await supabase.auth.getUser();
        const user = userRes.data.user;

        if (!user) {
          if (!cancelled) setCanManage(false);
          return;
        }

        const email = user.email?.toLowerCase() ?? null;

        if (!email) {
          if (!cancelled) setCanManage(true);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", orgId)
          .ilike("email", email)
          .maybeSingle();

        if (error || !data) {
          if (!cancelled) setCanManage(true);
          return;
        }

        const role = (data.role ?? "").toLowerCase();
        if (!cancelled) {
          setCanManage(
            role === "owner" || role === "manager" || role === "admin"
          );
        }
      } catch {
        if (!cancelled) setCanManage(true);
      }
    }

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [activeLocationLoading, orgId]);

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
    if (!orgId) return alert("No organisation found.");

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return alert(error.message);
    await refresh();
  }

  function normalizeBeforeSave(s: SupplierEdit) {
    const cleanCats = Array.from(
      new Set(s.categories.map((x) => x.trim()).filter(Boolean))
    );

    return {
      name: s.name.trim(),
      contact: s.contact.trim() || null,
      phone: s.phone.trim() || null,
      email: s.email.trim() || null,
      categories: cleanCats,
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
    if (!orgId) return alert("No organisation found.");

    const basePayload = normalizeBeforeSave(editing);

    let error: any = null;

    if (locationId) {
      const attempt = await supabase
        .from("suppliers")
        .update({
          ...basePayload,
          location_id: locationId,
        })
        .eq("id", editing.id)
        .eq("org_id", orgId);

      if (!attempt.error) {
        setEditOpen(false);
        setEditing(null);
        await refresh();
        return;
      }

      if (!isMissingLocationColumnError(attempt.error)) {
        return alert(attempt.error.message);
      }

      error = attempt.error;
    }

    const fallback = await supabase
      .from("suppliers")
      .update(basePayload)
      .eq("id", editing.id)
      .eq("org_id", orgId);

    if (fallback.error) {
      return alert(fallback.error.message || error?.message || "Failed to save supplier.");
    }

    setEditOpen(false);
    setEditing(null);
    await refresh();
  }

  async function saveAdd() {
    if (!adding.name.trim()) return alert("Name is required.");
    if (!canManage) {
      alert("Only managers / owners can add suppliers.");
      return;
    }
    if (!orgId) return alert("No organisation found.");

    const basePayload = {
      org_id: orgId,
      ...normalizeBeforeSave(adding),
    };

    if (locationId) {
      const attempt = await supabase.from("suppliers").insert({
        ...basePayload,
        location_id: locationId,
      });

      if (!attempt.error) {
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
        await refresh();
        return;
      }

      if (!isMissingLocationColumnError(attempt.error)) {
        return alert(attempt.error.message);
      }
    }

    const fallback = await supabase.from("suppliers").insert(basePayload);
    if (fallback.error) return alert(fallback.error.message);

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
    await refresh();
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="mx-auto w-full max-w-6xl px-0 sm:px-4">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-900">Suppliers</h1>

        <div className="text-xs text-slate-500">
          Viewing:{" "}
          <span className="font-semibold text-slate-700">
            {locationId ? "Current location" : "Organisation-wide"}
          </span>
        </div>

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

        <div className="mt-4 text-xs text-slate-500">
          Add suppliers - keep track of suppliers, their details and products.
        </div>
      </div>

      {activeLocationLoading || loading ? (
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
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            r.active
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          )}
                        >
                          {r.active ? "Active" : "Inactive"}
                        </span>
                        {cats.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {cats.length} categor{cats.length > 1 ? "ies" : "y"}
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
                            { label: "Edit", onClick: () => openEdit(r) },
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
                    <span className="text-[11px] text-slate-500">No categories</span>
                  )}
                </div>

                {r.notes && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                    {r.notes}
                  </div>
                )}

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
                  onChange={(e) => setEditing((s) => ({ ...s!, name: e.target.value }))}
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
                    onChange={(e) => setEditing((s) => ({ ...s!, phone: e.target.value }))}
                  />
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Email"
                    value={editing.email}
                    onChange={(e) => setEditing((s) => ({ ...s!, email: e.target.value }))}
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
                          onClick={() => toggleCatNullable(setEditing, c)}
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
                        setEditing((s) => ({ ...s!, addCategory: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFreeCatNullable(editing, setEditing);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => addFreeCatNullable(editing, setEditing)}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  placeholder="Notes"
                  value={editing.notes}
                  onChange={(e) => setEditing((s) => ({ ...s!, notes: e.target.value }))}
                />

                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={editing.active}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s!, active: e.target.checked }))
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
                  onChange={(e) => setAdding((s) => ({ ...s, name: e.target.value }))}
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
                    onChange={(e) => setAdding((s) => ({ ...s, phone: e.target.value }))}
                  />
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    placeholder="Email"
                    value={adding.email}
                    onChange={(e) => setAdding((s) => ({ ...s, email: e.target.value }))}
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
                          onClick={() => toggleCatNonNull(setAdding, c)}
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
                        setAdding((s) => ({ ...s, addCategory: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFreeCatNonNull(adding, setAdding);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => addFreeCatNonNull(adding, setAdding)}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  placeholder="Notes"
                  value={adding.notes}
                  onChange={(e) => setAdding((s) => ({ ...s, notes: e.target.value }))}
                />

                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={adding.active}
                    onChange={(e) => setAdding((s) => ({ ...s, active: e.target.checked }))}
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