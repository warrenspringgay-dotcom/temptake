"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// If your project already exports these from actions, keep this import.
// The component also works if these functions are not present (it falls back to /api).
let actions: {
  list?: () => Promise<Supplier[]>;
  upsert?: (input: SupplierInput) => Promise<Supplier>;
  remove?: (id: string) => Promise<void>;
} = {};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@/app/actions/suppliers");
  actions.list = mod.listSuppliers ?? mod.list;
  actions.upsert = mod.upsertSupplier ?? mod.upsert;
  actions.remove = mod.deleteSupplier ?? mod.remove;
} catch { /* noop fallback to /api below */ }

// ---- Types
export type Supplier = {
  id?: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  categories?: string[] | null; // e.g. ["Meat","Dairy"]
};

export type SupplierInput = Omit<Supplier, "id"> & { id?: string };

// ---- Small helpers
function emptyToUndef(v?: string | null) {
  const s = (v ?? "").trim();
  return s.length ? s : undefined;
}

function uniqueId() {
  return Math.random().toString(36).slice(2);
}

const CATEGORIES = [
  "Produce",
  "Meat",
  "Dairy",
  "Bakery",
  "Dry Goods",
  "Beverages",
  "Seafood",
  "Other",
];

export default function SuppliersManager() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Supplier>({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    notes: "",
    categories: [],
  });

  const nameRef = useRef<HTMLInputElement>(null);

  // --- Data IO (uses server actions if available, otherwise /api fallback)
  async function listSafe() {
    try {
      if (actions.list) return await actions.list();
      const r = await fetch("/api/suppliers", { cache: "no-store" });
      if (!r.ok) return [];
      const j = await r.json().catch(() => []);
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }

  async function upsertSafe(input: SupplierInput) {
    if (!input.name?.trim()) return;
    try {
      if (actions.upsert) return await actions.upsert(input);
      const r = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error("Save failed");
      return await r.json();
    } catch {
      // soft-fail
    }
  }

  async function deleteSafe(id: string) {
    try {
      if (actions.remove) return await actions.remove(id);
      await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      // soft-fail
    }
  }

  useEffect(() => {
    (async () => {
      const list = await listSafe();
      setRows(list);
    })();
  }, []);

  // --- Search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.name,
        r.contact_name,
        r.phone,
        r.email,
        r.notes,
        ...(r.categories ?? []),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  // --- CRUD
  function startAdd() {
    setForm({
      id: undefined,
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      notes: "",
      categories: [],
    });
    setOpen(true);
    // delay focus a tick for modal mount
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function startEdit(r: Supplier) {
    setForm({
      id: r.id,
      name: r.name ?? "",
      contact_name: r.contact_name ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      notes: r.notes ?? "",
      categories: [...(r.categories ?? [])],
    });
    setOpen(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    const payload: SupplierInput = {
      id: form.id,
      name: form.name.trim(),
      contact_name: emptyToUndef(form.contact_name ?? ""),
      phone: emptyToUndef(form.phone ?? ""),
      email: emptyToUndef(form.email ?? ""),
      notes: emptyToUndef(form.notes ?? ""),
      categories: (form.categories ?? []).length ? form.categories : [],
    };

    await upsertSafe(payload);
    const next = await listSafe();
    setRows(next);
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    if (!confirm("Delete this supplier?")) return;
    await deleteSafe(id);
    const next = await listSafe();
    setRows(next);
  }

  // --- UI
  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4">
      {/* Header: phone-safe layout */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Suppliers</h1>

        {/* Mobile-first button; never off-screen */}
        <button
          onClick={startAdd}
          className="order-1 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:order-none"
        >
          + Add supplier
        </button>

        {/* Search grows to full width on small screens */}
        <div className="ml-auto w-full sm:ml-0 sm:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full min-w-[220px] rounded-md border border-gray-300 px-3 text-sm sm:w-[280px]"
          />
        </div>
      </div>

      {/* Optional floating action button for small phones */}
      <button
        onClick={startAdd}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg sm:hidden"
        aria-label="Add supplier"
      >
        +
      </button>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Categories</th>
                <th className="py-2 pr-3">Notes</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id ?? r.name ?? uniqueId()} className="border-t">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col">
                        {r.contact_name ? (
                          <span className="font-medium">{r.contact_name}</span>
                        ) : null}
                        {r.email ? <span>{r.email}</span> : null}
                        {r.phone ? (
                          <span className="text-gray-500">{r.phone}</span>
                        ) : null}
                        {!r.contact_name && !r.email && !r.phone ? "—" : null}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {(r.categories ?? []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {(r.categories ?? []).map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 max-w-[18rem]">
                      <div className="truncate">{r.notes || "—"}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(r)}
                          className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => r.id && handleDelete(r.id)}
                          className="h-8 rounded-md border border-gray-200 bg-white px-3 text-xs hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-gray-500 italic"
                  >
                    No suppliers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (mobile friendly) */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {form.id ? "Edit supplier" : "Add supplier"}
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-slate-500 hover:bg-gray-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 py-4">
              <label className="mb-1 block text-xs text-slate-600">
                Supplier name
              </label>
              <input
                ref={nameRef}
                autoFocus
                className="mb-4 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., ABC Meats Ltd"
                required
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    (e.currentTarget as HTMLInputElement).form?.requestSubmit();
                  }
                }}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Name of contact
                  </label>
                  <input
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    value={form.contact_name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                    placeholder="e.g., Emma Jones"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Phone
                  </label>
                  <input
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+44…"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Email
                  </label>
                  <input
                    type="email"
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const on = (form.categories ?? []).includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setForm((f) => {
                              const set = new Set(f.categories ?? []);
                              if (set.has(c)) set.delete(c);
                              else set.add(c);
                              return { ...f, categories: Array.from(set) };
                            })
                          }
                          className={`rounded-full px-2 py-1 text-xs ${
                            on
                              ? "bg-slate-900 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-600">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Optional"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
                      }
                    }}
                  />
                </div>
              </div>
            </form>

            {/* Sticky footer */}
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form={undefined}
                  onClick={(e) => {
                    // submit the form above programmatically
                    (e.currentTarget.closest("div")?.previousElementSibling?.querySelector("form") as HTMLFormElement | null)?.requestSubmit();
                  }}
                  disabled={saving || !form.name.trim()}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white ${
                    saving ? "bg-gray-400" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {form.id ? "Save changes" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
