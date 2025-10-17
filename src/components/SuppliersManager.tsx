// src/app/suppliers/SuppliersManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Supplier = {
  id?: string;
  org_id?: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  categories?: string[] | null;
  active?: boolean | null;
};

async function getOrgIdClient(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return null;

    const { data: prof } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", uid)
      .maybeSingle();
    if (prof?.org_id) return prof.org_id as string;

    const { data: uo } = await supabase
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", uid)
      .maybeSingle();
    return (uo?.org_id as string) ?? null;
  } catch {
    return null;
  }
}

export default function SuppliersManager() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Supplier>({ name: "", active: true });

  useEffect(() => {
    (async () => setOrgId(await getOrgIdClient()))();
  }, []);

  async function load() {
    if (!orgId) return;
    const { data } = await supabase.from("suppliers").select("*").eq("org_id", orgId).order("name");
    setRows(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.name, r.contact, r.phone, r.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  function openAdd() {
    setForm({ name: "", contact: "", phone: "", email: "", categories: [], active: true });
    setModalOpen(true);
  }

  function openEdit(r: Supplier) {
    setForm({ ...r });
    setModalOpen(true);
  }

  async function save() {
    if (!orgId) return;
    if (!form.name.trim()) return;

    const payload: Supplier = {
      ...form,
      org_id: orgId,
      categories: form.categories ?? [],
      active: form.active ?? true,
    };

    const { error } = await supabase.from("suppliers").upsert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete supplier?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Suppliers</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 w-[240px] rounded-xl border px-3 text-sm"
          />
          <button
            onClick={openAdd}
            className="h-9 rounded-xl bg-black px-3 text-sm font-medium text-white hover:bg-gray-900"
          >
            + Add supplier
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
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
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.contact || "—"}</td>
                    <td className="py-2 pr-3">{r.phone || "—"}</td>
                    <td className="py-2 pr-3">{r.email || "—"}</td>
                    <td className="py-2 pr-3">{(r.categories ?? []).join(", ") || "—"}</td>
                    <td className="py-2 pr-3">{r.active ? "Yes" : "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="rounded-md border px-2 text-xs hover:bg-gray-50">
                          ✏️
                        </button>
                        <button onClick={() => remove(r.id)} className="rounded-md border px-2 text-xs hover:bg-gray-50">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No suppliers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="mx-auto mt-20 w-full max-w-xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">{form.id ? "Edit supplier" : "Add supplier"}</div>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-2 hover:bg-gray-100">✕</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Contact</label>
                  <input
                    value={form.contact ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Phone</label>
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Email</label>
                <input
                  value={form.email ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="sup-active"
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                <label htmlFor="sup-active" className="text-sm">Active</label>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
