"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ---------- Types ---------- */
type Supplier = {
  id: string;
  name: string;          // Supplier name
  contact?: string;      // Name of contact
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  categories: string[];  // product types
};

/* ---------- Constants ---------- */
const PRODUCT_TYPES = [
  "Produce",
  "Meat",
  "Dairy",
  "Bakery",
  "Dry Goods",
  "Beverages",
  "Seafood",
  "Other",
] as const;

const LS_KEY = "tt_suppliers";
const uid = () => Math.random().toString(36).slice(2);

/* ---------- Small UI helpers ---------- */
function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900"
      : "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50 active:bg-white";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-gray-300 bg-white text-slate-800 hover:bg-gray-50"
      }`}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}

/* ---------- LocalStorage helpers ---------- */
function lsGet<T>(k: string, f: T): T {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : f;
  } catch {
    return f;
  }
}
function lsSet<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
}

/* ---------- Page component ---------- */
export default function SuppliersManager() {
  const [list, setList] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing?: Supplier | null }>({
    open: false,
  });

  // Guard for SSR
  useEffect(() => {
    if (typeof window !== "undefined") {
      setList(lsGet<Supplier[]>(LS_KEY, []));
    }
  }, []);

  const filtered = useMemo(
    () =>
      list.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          (s.contact ?? "").toLowerCase().includes(q.toLowerCase())
      ),
    [list, q]
  );

  function save(s: Omit<Supplier, "id"> & { id?: string }) {
    setList((prev) => {
      const exists = s.id ? prev.find((x) => x.id === s.id) : undefined;
      const next = exists
        ? prev.map((x) => (x.id === s.id ? { ...exists, ...s } : x))
        : ([{ id: uid(), ...s } as Supplier, ...prev] as Supplier[]);
      if (typeof window !== "undefined") lsSet(LS_KEY, next);
      return next;
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this supplier?")) return;
    setList((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (typeof window !== "undefined") lsSet(LS_KEY, next);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold sm:text-xl">Suppliers</h1>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm sm:w-64"
            />
            <Button onClick={() => setModal({ open: true, editing: null })}>+ Add supplier</Button>
          </div>
        </div>

        {/* List container */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">All suppliers</div>

          {/* Mobile: card list */}
          <div className="block md:hidden">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No suppliers yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filtered.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="col-span-1">Contact: {s.contact || "—"}</span>
                          <span className="col-span-1">Phone: {s.phone || "—"}</span>
                          <span className="col-span-2">Email: {s.email || "—"}</span>
                          <span className="col-span-2">
                            Categories: {s.categories?.length ? s.categories.join(", ") : "—"}
                          </span>
                          <span className="col-span-2">Active: {s.active ? "Yes" : "No"}</span>
                        </div>
                      </div>

                      <div className="shrink-0 space-x-2">
                        <Button
                          variant="outline"
                          className="h-9 px-2 text-xs"
                          aria-label="Edit supplier"
                          onClick={() => setModal({ open: true, editing: s })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 px-2 text-xs text-red-700"
                          aria-label="Delete supplier"
                          onClick={() => remove(s.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No suppliers yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="py-2 pr-3">Supplier</th>
                      <th className="py-2 pr-3">Contact</th>
                      <th className="py-2 pr-3">Phone</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Categories</th>
                      <th className="py-2 pr-3">Active</th>
                      <th className="py-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-t border-gray-200">
                        <td className="py-2 pr-3">{s.name}</td>
                        <td className="py-2 pr-3">{s.contact || "—"}</td>
                        <td className="py-2 pr-3">{s.phone || "—"}</td>
                        <td className="py-2 pr-3">{s.email || "—"}</td>
                        <td className="py-2 pr-3">
                          {s.categories?.length ? s.categories.join(", ") : "—"}
                        </td>
                        <td className="py-2 pr-3">{s.active ? "Yes" : "No"}</td>
                        <td className="py-2 pr-3 text-right">
                          <Button
                            variant="outline"
                            className="mr-2 h-9 px-2 text-xs"
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => setModal({ open: true, editing: s })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 px-2 text-xs text-red-700"
                            title="Delete"
                            aria-label="Delete"
                            onClick={() => remove(s.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {modal.open && (
        <SupplierModal
          initial={modal.editing ?? null}
          onClose={() => setModal({ open: false })}
          onSave={(payload) => {
            save(payload);
            setModal({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* ---------- Modal ---------- */
function SupplierModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Supplier | null;
  onClose: () => void;
  onSave: (s: Omit<Supplier, "id"> & { id?: string }) => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    name: initial?.name ?? "",
    contact: initial?.contact ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
    categories: initial?.categories ?? ([] as string[]),
  });

  function toggleCat(c: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));
  }

  function submit() {
    if (!form.name.trim()) {
      alert("Supplier name is required.");
      return;
    }
    onSave(form);
  }

  function onLastKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Full screen on mobile, regular dialog on desktop */}
      <div className="h-[100dvh] w-full overflow-auto bg-white sm:h-auto sm:max-w-2xl sm:rounded-xl sm:border sm:border-gray-200 sm:shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="text-sm font-medium">{form.id ? "Edit supplier" : "Add supplier"}</div>
          <button
            className="rounded p-1 text-slate-500 hover:bg-gray-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-6">
          <div>
            <label className="mb-1 block text-sm">Supplier name *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Name of contact</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Phone</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Categories</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((c) => (
                <Chip key={c} selected={form.categories.includes(c)} onClick={() => toggleCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <details className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer select-none text-sm text-slate-700">
              Additional information
            </summary>
            <div className="mt-3">
              <label className="mb-1 block text-sm">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                onKeyDown={onLastKeyDown}
              />
            </div>
          </details>

          <div className="flex items-center justify-between pb-2 sm:pb-0">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit}>{form.id ? "Save changes" : "Save"}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
