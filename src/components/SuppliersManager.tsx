"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";

type SupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  categories: string | null; // comma-separated
  notes: string | null;
  active: boolean | null;
};

const SUPPLIER_CATEGORIES = [
  "Meat",
  "Fish",
  "Produce",
  "Dairy",
  "Bakery",
  "Dry Goods",
  "Frozen",
  "Drinks",
  "Packaging",
  "Cleaning",
  "Other",
] as const;
type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

function parseCats(s: string | null): SupplierCategory[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean) as SupplierCategory[];
}
function catsToString(arr: string[]): string {
  return arr.join(", ");
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? "bg-black text-white border-black" : "hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function SuppliersManager() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // view / edit
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<SupplierRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [editCats, setEditCats] = useState<SupplierCategory[]>([]);

  // add
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    notes: "",
    active: true,
  });
  const [addCats, setAddCats] = useState<SupplierCategory[]>([]);

  function toggle(arr: SupplierCategory[], v: SupplierCategory, setter: (next: SupplierCategory[]) => void) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

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
      [r.name, r.contact, r.email, r.phone, r.categories].filter(Boolean).some((s) => s!.toLowerCase().includes(term))
    );
  }, [q, rows]);

  function openView(r: SupplierRow) {
    setViewing(r);
    setViewOpen(true);
  }
  function openEdit(r: SupplierRow) {
    setEditing({ ...r });
    setEditOpen(true);
    setEditCats(parseCats(r.categories));
  }

  async function removeSupplier(id: string) {
    if (!confirm("Delete supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return alert(error.message);
    refresh();
  }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: editing.name,
        contact: editing.contact,
        phone: editing.phone,
        email: editing.email,
        categories: catsToString(editCats),
        notes: editing.notes,
        active: editing.active ?? true,
      })
      .eq("id", editing.id);
    if (error) return alert(error.message);
    setEditOpen(false);
    setEditing(null);
    refresh();
  }

  async function saveAdd() {
    const orgId = await getActiveOrgIdClient();
    if (!orgId) return alert("No organisation found.");
    if (!adding.name.trim()) return alert("Name is required.");
    const { error } = await supabase.from("suppliers").insert({
      org_id: orgId,
      name: adding.name.trim(),
      contact: adding.contact || null,
      phone: adding.phone || null,
      email: adding.email || null,
      categories: catsToString(addCats) || null,
      notes: adding.notes || null,
      active: adding.active,
    });
    if (error) return alert(error.message);
    setAddOpen(false);
    setAdding({ name: "", contact: "", phone: "", email: "", notes: "", active: true });
    setAddCats([]);
    refresh();
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Suppliers</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-xl border px-3 md:w-64"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="whitespace-nowrap rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-900"
            onClick={() => setAddOpen(true)}
          >
            + Add supplier
          </button>
        </div>
      </div>

      {/* Desktop table (trimmed) */}
      <div className="hidden overflow-x-auto md:block">
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
                <td colSpan={7} className="py-6 text-center text-gray-500">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">No suppliers yet.</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">
                    <button className="text-blue-600 underline hover:text-blue-700" onClick={() => openView(r)}>
                      {r.name}
                    </button>
                  </td>
                  <td className="py-2 pr-3">{r.contact ?? "—"}</td>
                  <td className="py-2 pr-3">{r.phone ?? "—"}</td>
                  <td className="py-2 pr-3 truncate max-w-[220px]">{r.email ?? "—"}</td>
                  <td className="py-2 pr-3">{parseCats(r.categories).join(", ") || "—"}</td>
                  <td className="py-2 pr-3">{r.active ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3 text-right">
                    <ActionMenu
                      items={[
                        { label: "View", onClick: () => openView(r) },
                        { label: "Edit", onClick: () => openEdit(r) },
                        { label: "Delete", onClick: () => removeSupplier(r.id), variant: "danger" },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-lg border bg-white p-4 text-center text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-center text-gray-500">No suppliers yet.</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-white p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.active ? "Active" : "Inactive"}</div>
                </div>
                <ActionMenu
                  items={[
                    { label: "View", onClick: () => openView(r) },
                    { label: "Edit", onClick: () => openEdit(r) },
                    { label: "Delete", onClick: () => removeSupplier(r.id), variant: "danger" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div><span className="text-gray-500">Contact:</span> {r.contact ?? "—"}</div>
                <div><span className="text-gray-500">Phone:</span> {r.phone ?? "—"}</div>
                <div className="col-span-2 truncate"><span className="text-gray-500">Email:</span> {r.email ?? "—"}</div>
                <div className="col-span-2"><span className="text-gray-500">Categories:</span> {parseCats(r.categories).join(", ") || "—"}</div>
                {r.notes ? <div className="col-span-2 text-gray-600">{r.notes}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View card */}
      {viewOpen && viewing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div className="mx-auto mt-16 w/full max-w-xl rounded-2xl border bg-white p-0" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-t-2xl bg-slate-800 p-4 text-white">
              <div className="text-sm opacity-80">Supplier</div>
              <div className="text-xl font-semibold">{viewing.name}</div>
              <div className="opacity-80">{viewing.active ? "Active" : "Inactive"}</div>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div><span className="font-medium">Contact:</span> {viewing.contact || "—"}</div>
              <div><span className="font-medium">Phone:</span> {viewing.phone || "—"}</div>
              <div><span className="font-medium">Email:</span> {viewing.email || "—"}</div>
              <div><span className="font-medium">Categories:</span> {parseCats(viewing.categories).join(", ") || "—"}</div>
              <div><span className="font-medium">Notes:</span> {viewing.notes || "—"}</div>
            </div>
            <div className="flex justify-end gap-2 border-t p-3">
              <button className="rounded-md px-3 py-1.5 hover:bg-gray-100" onClick={() => setViewOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal (with categories picker) */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEditOpen(false)}>
          <div className="mx-auto mt-16 w-full max-w-xl rounded-2xl border bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Edit supplier</div>
              <button onClick={() => setEditOpen(false)} className="rounded-md p-2 hover:bg-gray-100">✕</button>
            </div>

            <div className="grid gap-3">
              <input className="h-10 w-full rounded-xl border px-3" value={editing.name} onChange={(e) => setEditing((s) => ({ ...s!, name: e.target.value }))} />
              <input className="h-10 w-full rounded-xl border px-3" placeholder="Contact" value={editing.contact ?? ""} onChange={(e) => setEditing((s) => ({ ...s!, contact: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="h-10 w-full rounded-xl border px-3" placeholder="Phone" value={editing.phone ?? ""} onChange={(e) => setEditing((s) => ({ ...s!, phone: e.target.value }))} />
                <input className="h-10 w-full rounded-xl border px-3" placeholder="Email" value={editing.email ?? ""} onChange={(e) => setEditing((s) => ({ ...s!, email: e.target.value }))} />
              </div>

              {/* Categories chips */}
              <div>
                <div className="mb-1 text-xs text-gray-500">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <Chip key={c} active={editCats.includes(c)} onClick={() => toggle(editCats, c, setEditCats)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <textarea className="min-h-[90px] w-full rounded-xl border px-3 py-2" placeholder="Notes" value={editing.notes ?? ""} onChange={(e) => setEditing((s) => ({ ...s!, notes: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing((s) => ({ ...s!, active: e.target.checked }))} />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal (with categories chips) */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setAddOpen(false)}>
          <div className="mx-auto mt-16 w-full max-w-xl rounded-2xl border bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Add supplier</div>
              <button onClick={() => setAddOpen(false)} className="rounded-md p-2 hover:bg-gray-100">✕</button>
            </div>

            <div className="grid gap-3">
              <input className="h-10 w-full rounded-xl border px-3" placeholder="Name" value={adding.name} onChange={(e) => setAdding((s) => ({ ...s, name: e.target.value }))} />
              <input className="h-10 w-full rounded-xl border px-3" placeholder="Contact" value={adding.contact} onChange={(e) => setAdding((s) => ({ ...s, contact: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="h-10 w-full rounded-xl border px-3" placeholder="Phone" value={adding.phone} onChange={(e) => setAdding((s) => ({ ...s, phone: e.target.value }))} />
                <input className="h-10 w-full rounded-xl border px-3" placeholder="Email" value={adding.email} onChange={(e) => setAdding((s) => ({ ...s, email: e.target.value }))} />
              </div>

              <div>
                <div className="mb-1 text-xs text-gray-500">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <Chip key={c} active={addCats.includes(c)} onClick={() => toggle(addCats, c, setAddCats)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <textarea className="min-h-[90px] w-full rounded-xl border px-3 py-2" placeholder="Notes" value={adding.notes} onChange={(e) => setAdding((s) => ({ ...s, notes: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={adding.active} onChange={(e) => setAdding((s) => ({ ...s, active: e.target.checked }))} />
                Active
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setAddOpen(false)}>Cancel</button>
                <button className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900" onClick={saveAdd} disabled={!adding.name.trim()}>
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
