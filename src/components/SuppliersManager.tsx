"use client";

import React, { useEffect, useMemo, useState } from "react";
import { uid } from "@/lib/uid";

export type Supplier = {
  id: string;
  name: string;
  categories?: string;
  contact?: string;
  phone?: string;
  email?: string;
  notes?: string;
  allergenStatementUrl?: string;
  haccpCertUrl?: string;
  insuranceExpiry?: string; // ISO date
};

const LS_KEY = "tt_suppliers_v2";

function load(): Supplier[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Supplier[]; }
  catch { return []; }
}
function save(list: Supplier[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(load);
  useEffect(() => save(suppliers), [suppliers]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact ?? "").toLowerCase().includes(q) ||
        (s.categories ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, query]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Supplier | null>(null);
  const [showMore, setShowMore] = useState(false);

  function openAdd() {
    setDraft({
      id: uid(),
      name: "",
      contact: "",
      phone: "",
      email: "",
      categories: "",
      notes: "",
      allergenStatementUrl: "",
      haccpCertUrl: "",
      insuranceExpiry: "",
    });
    setShowMore(false);
    setModalOpen(true);
  }
  function saveDraft() {
    if (!draft) return;
    setSuppliers((ss) => {
      const exists = ss.some((s) => s.id === draft.id);
      return exists ? ss.map((s) => (s.id === draft.id ? draft : s)) : [...ss, draft];
    });
    setModalOpen(false);
  }

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          onClick={openAdd}
        >
          + Add supplier
        </button>

        <details className="relative">
          <summary className="cursor-pointer select-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            More ▾
          </summary>
          <div className="absolute z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white shadow">
            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Export CSV</button>
            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Import CSV</button>
            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Print</button>
          </div>
        </details>

        <div className="flex-1" />
        <input
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          placeholder="Search suppliers / contact / category"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[820px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Categories</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No suppliers yet.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.categories ?? ""}</td>
                <td className="px-3 py-2">{s.contact ?? ""}</td>
                <td className="px-3 py-2">{s.phone ?? ""}</td>
                <td className="px-3 py-2">{s.email ?? ""}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => { setDraft(s); setShowMore(Boolean(s.allergenStatementUrl || s.haccpCertUrl || s.insuranceExpiry)); setModalOpen(true); }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setSuppliers((ss) => ss.filter((x) => x.id !== s.id))}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow">
            <div className="border-b px-4 py-3 font-semibold">Supplier</div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Supplier name</div>
                  <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                    value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Categories</div>
                  <input className="w-full rounded-md border border-gray-300 px-2 py-1.5" placeholder="Dairy, Bread"
                    value={draft.categories ?? ""} onChange={(e) => setDraft({ ...draft, categories: e.target.value })} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Contact</div>
                  <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                    value={draft.contact ?? ""} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Phone</div>
                  <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                    value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-gray-600">Email</div>
                  <input className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                    value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </label>
                <label className="sm:col-span-2 text-sm">
                  <div className="mb-1 text-gray-600">Notes</div>
                  <textarea className="w-full rounded-md border border-gray-300 px-2 py-1.5" rows={3}
                    value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                </label>
              </div>

              <details open={showMore} onToggle={(e) => setShowMore((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer select-none font-medium">Additional information</summary>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">Allergen statement (URL)</div>
                    <input className="w-full rounded-md border border-gray-300 px-2 py-1.5" placeholder="https://…"
                      value={draft.allergenStatementUrl ?? ""} onChange={(e) => setDraft({ ...draft, allergenStatementUrl: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">HACCP certificate (URL)</div>
                    <input className="w-full rounded-md border border-gray-300 px-2 py-1.5" placeholder="https://…"
                      value={draft.haccpCertUrl ?? ""} onChange={(e) => setDraft({ ...draft, haccpCertUrl: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">Insurance expiry</div>
                    <input type="date" className="w-full rounded-md border border-gray-300 px-2 py-1.5"
                      value={draft.insuranceExpiry ?? ""} onChange={(e) => setDraft({ ...draft, insuranceExpiry: e.target.value })} />
                  </label>
                </div>
              </details>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button className="rounded-md px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800" onClick={saveDraft}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
