"use client";

import React from "react";
import { createClient } from "@supabase/supabase-js";

/** Supabase browser client */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Supplier = {
  id: string;
  name: string;
  categories: string[];
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  docAllergen?: string | null; // ISO date string
  docHaccp?: string | null;    // ISO date string
  docInsurance?: string | null;// ISO date string
  reviewEveryDays?: number | null;
  notes?: string | null;
};

const CATEGORY_OPTIONS = [
  "Produce", "Meat", "Dairy", "Bakery", "Dry Goods", "Beverages", "Seafood", "Other",
] as const;

type ModalState =
  | { open: false }
  | { open: true; mode: "add" | "edit"; supplier?: Supplier };

export default function SuppliersManager() {
  const [rows, setRows] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<ModalState>({ open: false });
  const [moreOpen, setMoreOpen] = React.useState(false);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setRows((data ?? []) as Supplier[]);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    fetchAll();
  }, []);

  async function upsertOne(payload: Omit<Supplier, "id">, id?: string) {
    setError(null);
    if (!id) {
      // insert
      const { data, error } = await supabase
        .from("suppliers")
        .insert(payload)
        .select()
        .single();
      if (error) return setError(error.message);
      setRows((prev) => [...prev, data as Supplier]);
    } else {
      // update (optimistic)
      const prev = rows.find((r) => r.id === id);
      if (!prev) return;
      const nextLocal: Supplier = { ...prev, ...payload };
      setRows((prevAll) => prevAll.map((r) => (r.id === id ? nextLocal : r)));
      const { error } = await supabase.from("suppliers").update(payload).eq("id", id);
      if (error) {
        setError(error.message);
        setRows((prevAll) => prevAll.map((r) => (r.id === id ? prev : r)));
      }
    }
  }

  async function removeOne(id: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setRows(prev);
    }
  }

  function exportCSV() {
    const header = [
      "Name",
      "Categories",
      "Contact",
      "Phone",
      "Email",
      "Allergen Cert",
      "HACCP Cert",
      "Insurance Expiry",
      "Review (days)",
      "Notes",
    ];
    const lines = [header.join(",")];
    for (const s of rows) {
      const row = [
        csvCell(s.name),
        csvCell(s.categories.join("|")),
        csvCell(s.contact ?? ""),
        csvCell(s.phone ?? ""),
        csvCell(s.email ?? ""),
        csvCell(s.docAllergen ?? ""),
        csvCell(s.docHaccp ?? ""),
        csvCell(s.docInsurance ?? ""),
        String(s.reviewEveryDays ?? ""),
        csvCell(s.notes ?? ""),
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    download(url, "suppliers.csv");
  }

  function importCSV(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return;
      const [, ...entries] = lines;
      const incoming: Array<Omit<Supplier, "id">> = entries.map((line) => {
        const cols = parseCsvLine(line);
        const name = cols[0] ?? "";
        const categories = (cols[1] ?? "").split("|").map((s) => s.trim()).filter(Boolean);
        const contact = cols[2] || null;
        const phone = cols[3] || null;
        const email = cols[4] || null;
        const docAllergen = cols[5] || null;
        const docHaccp = cols[6] || null;
        const docInsurance = cols[7] || null;
        const reviewEveryDays = cols[8] ? Number(cols[8]) : null;
        const notes = cols[9] || null;
        return { name, categories, contact, phone, email, docAllergen, docHaccp, docInsurance, reviewEveryDays, notes };
      });

      // Simplest approach: insert individually (you can optimize later)
      for (const payload of incoming) {
        await supabase.from("suppliers").insert(payload);
      }
      await fetchAll();
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Suppliers</h1>

        {/* Compact “More” dropdown */}
        <div className="relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
          >
            More ▾
          </button>
          {moreOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
              role="menu"
            >
              <button
                onClick={exportCSV}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                role="menuitem"
              >
                Export CSV
              </button>
              <label
                className="relative block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                role="menuitem"
              >
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importCSV(f);
                    setMoreOpen(false);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {rows.length} supplier{rows.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setModal({ open: true, mode: "add" })}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add supplier
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Categories</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Review (days)</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                  No suppliers yet.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.categories.join(", ")}</td>
                  <td className="px-3 py-2">{s.contact ?? ""}</td>
                  <td className="px-3 py-2">{s.phone ?? ""}</td>
                  <td className="px-3 py-2">{s.email ?? ""}</td>
                  <td className="px-3 py-2">{s.reviewEveryDays ?? ""}</td>
                  <td className="px-3 py-2">{s.notes ?? ""}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setModal({ open: true, mode: "edit", supplier: s })}
                        className="rounded-md border bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
                        title="Edit"
                      >
                        🖉
                      </button>
                      <button
                        onClick={() => removeOne(s.id)}
                        className="rounded-md border bg-white px-2 py-1 text-sm text-rose-700 shadow-sm hover:bg-rose-50"
                        title="Delete"
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

      {modal.open && (
        <SupplierModal
          mode={modal.mode}
          supplier={modal.mode === "edit" ? modal.supplier : undefined}
          onCancel={() => setModal({ open: false })}
          onSave={async (payload) => {
            await upsertOne(payload, modal.mode === "edit" ? modal.supplier?.id : undefined);
            setModal({ open: false });
            await fetchAll();
          }}
        />
      )}
    </div>
  );
}

function SupplierModal(props: {
  mode: "add" | "edit";
  supplier?: Supplier;
  onCancel: () => void;
  onSave: (payload: Omit<Supplier, "id">) => void | Promise<void>;
}) {
  const { mode, supplier, onCancel, onSave } = props;
  const [form, setForm] = React.useState<Omit<Supplier, "id">>(() => ({
    name: supplier?.name ?? "",
    categories: supplier?.categories ?? [],
    contact: supplier?.contact ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    docAllergen: supplier?.docAllergen ?? "",
    docHaccp: supplier?.docHaccp ?? "",
    docInsurance: supplier?.docInsurance ?? "",
    reviewEveryDays: supplier?.reviewEveryDays ?? 365,
    notes: supplier?.notes ?? "",
  }));

  const [moreOpen, setMoreOpen] = React.useState(false); // collapsible "Additional information"

  function toggleCategory(c: (typeof CATEGORY_OPTIONS)[number]) {
    setForm((f) => {
      const has = f.categories.includes(c);
      const next = has ? f.categories.filter((x) => x !== c) : [...f.categories, c];
      return { ...f, categories: next };
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{mode === "add" ? "Add supplier" : "Edit supplier"}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <label className="block text-sm">
            <div className="mb-1 text-gray-600">Supplier name</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <div className="space-y-1 text-sm">
            <div className="text-gray-600">Categories</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => {
                const active = form.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full border px-3 py-1 ${
                      active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-300 bg-white"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Contact</div>
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={form.contact ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Phone</div>
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-gray-600">Email</div>
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
          </div>

          {/* Collapsible additional info */}
          <details className="rounded-md border border-gray-200 p-3">
            <summary
              className="cursor-pointer select-none text-sm font-medium"
              onClick={() => setMoreOpen((v) => !v)}
            >
              Additional information
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Allergen statement date</div>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={form.docAllergen ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, docAllergen: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">HACCP certificate date</div>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={form.docHaccp ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, docHaccp: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Insurance expiry</div>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={form.docInsurance ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, docInsurance: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Review every (days)</div>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={form.reviewEveryDays ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reviewEveryDays: Number(e.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-gray-600">Notes</div>
                <input
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onCancel} className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- CSV helpers ------------------------------ */

function csvCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}