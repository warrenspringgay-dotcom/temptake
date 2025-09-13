// src/app/suppliers/SuppliersManager.tsx
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
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50";
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
      className={`rounded-full border px-3 py-1 text-sm ${
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

  useEffect(() => setList(lsGet<Supplier[]>(LS_KEY, [])), []);

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
      lsSet(LS_KEY, next);
      return next;
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this supplier?")) return;
    setList((prev) => {
      const next = prev.filter((x) => x.id !== id);
      lsSet(LS_KEY, next);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-60 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={() => setModal({ open: true, editing: null })}>+ Add supplier</Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">All suppliers</div>
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
                        <button
                          onClick={() => setModal({ open: true, editing: s })}
                          className="mr-2 rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                          title="Edit"
                          aria-label="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="rounded-md border px-2 py-1 text-sm text-red-700 hover:bg-gray-50"
                          title="Delete"
                          aria-label="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="text-sm font-medium">{form.id ? "Edit supplier" : "Add supplier"}</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-6 py-4">
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

          <div className="flex items-center justify-between">
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
