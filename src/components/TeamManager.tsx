"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";

/* -------------------- Types -------------------- */
type Member = {
  id: string;
  initials: string | null;
  name: string;
  email: string | null;
  role: string | null;
  phone: string | null;
  active: boolean | null;
  notes?: string | null;
};

type Training = {
  id: string;
  staff_id: string;
  type: string | null;
  certificate_url: string | null;
  awarded_on: string | null; // yyyy-mm-dd
  expires_on: string | null; // yyyy-mm-dd
  notes: string | null;
};

/* -------------------- Helpers -------------------- */
function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/* =================================================
   Component
================================================= */
export default function TeamManager() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  // search & filtering
  const [q, setQ] = useState("");

  // add/edit member
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  // view card
  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Member | null>(null);

  // education modal (add a record)
  const [eduOpen, setEduOpen] = useState(false);
  const [eduFor, setEduFor] = useState<Member | null>(null);
  const [eduSaving, setEduSaving] = useState(false);
  const [eduForm, setEduForm] = useState({
    course: "",
    provider: "",
    certificateUrl: "",
    completedOn: "",
    expiryOn: "",
    notes: "",
  });

  // member trainings
  const [eduList, setEduList] = useState<Training[]>([]);
  const [eduListLoading, setEduListLoading] = useState(false);

  /* -------------------- Load org + team -------------------- */
  async function load() {
    setLoading(true);
    try {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("team_members")
        .select("id, initials, name, email, role, phone, active, notes")
        .eq("org_id", id)
        .order("name", { ascending: true });

      if (error) throw error;
      setRows((data ?? []) as Member[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load team.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  /* -------------------- Derived: filtered -------------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.initials, r.name, r.email, r.role]
        .filter(Boolean)
        .some((s) => (s ?? "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  /* -------------------- CRUD: member -------------------- */
  function openAdd() {
    setEditing({
      id: "",
      initials: "",
      name: "",
      email: "",
      role: "",
      phone: "",
      active: true,
      notes: "",
    });
    setEditOpen(true);
  }

  function openEdit(m: Member) {
    setEditing({ ...m });
    setEditOpen(true);
  }

  async function saveMember() {
    if (!editing) return;
    try {
      if (!orgId) return alert("No organisation found.");
      if (!editing.name.trim()) return alert("Name is required.");

      if (editing.id) {
        const { error } = await supabase
          .from("team_members")
          .update({
            initials: editing.initials?.trim() || null,
            name: editing.name.trim(),
            email: editing.email?.trim() || null,
            role: editing.role?.trim() || null,
            phone: editing.phone?.trim() || null,
            notes: editing.notes?.trim() || null,
            active: editing.active ?? true,
          })
          .eq("id", editing.id)
          .eq("org_id", orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members").insert({
          org_id: orgId,
          initials: editing.initials?.trim() || null,
          name: editing.name.trim(),
          email: editing.email?.trim() || null,
          role: editing.role?.trim() || null,
          phone: editing.phone?.trim() || null,
          notes: editing.notes?.trim() || null,
          active: true,
        });
        if (error) throw error;
      }

      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Save failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this team member?")) return;
    try {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed.");
    }
  }

  /* -------------------- View card + trainings -------------------- */
  async function loadTrainingsFor(staffId: string) {
    setEduListLoading(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select("id, staff_id, type, certificate_url, awarded_on, expires_on, notes")
        .eq("staff_id", staffId)
        .order("awarded_on", { ascending: false });
      if (error) throw error;
      setEduList((data ?? []) as Training[]);
    } catch {
      setEduList([]);
    } finally {
      setEduListLoading(false);
    }
  }

  function openCard(m: Member) {
    setViewFor(m);
    setViewOpen(true);
    void loadTrainingsFor(m.id);
  }

  /* -------------------- Education modal (insert) -------------------- */
  function openEducation(m: Member) {
    setEduFor(m);
    setEduForm({
      course: "",
      provider: "",
      certificateUrl: "",
      completedOn: "",
      expiryOn: "",
      notes: "",
    });
    setEduOpen(true);
  }

  async function saveEducation() {
    if (!eduFor) return;
    if (!eduForm.course.trim()) return;

    try {
      if (!orgId) return alert("No organisation found.");
      setEduSaving(true);

      const me = (await supabase.auth.getUser()).data.user?.id ?? null;

      const payload: any = {
        staff_id: eduFor.id,
        type: eduForm.course.trim(),
        certificate_url: eduForm.certificateUrl.trim() || null,
        awarded_on: eduForm.completedOn || null,
        expires_on: eduForm.expiryOn || null,
        notes: [
          eduForm.provider && `Provider: ${eduForm.provider}`,
          eduForm.notes && eduForm.notes,
        ]
          .filter(Boolean)
          .join(" · ") || null,
        org_id: orgId,
        created_by: me,
      };

      const { error } = await supabase.from("trainings").insert(payload);
      if (error) throw error;

      await loadTrainingsFor(eduFor.id);
      setEduOpen(false);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save training.");
    } finally {
      setEduSaving(false);
    }
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Team</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            className="h-9 rounded-xl border px-3 text-sm"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            onClick={openAdd}
            className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            + Add member
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-24" />
            <col className="w-auto" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-[180px]" />
          </colgroup>

          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Initials</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3 text-center font-medium">{r.initials ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <button
                      className="text-blue-600 underline hover:text-blue-700"
                      onClick={() => openCard(r)}
                      title="Open card"
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="py-2 pr-3">{r.role ?? "—"}</td>
                  <td className="py-2 pr-3">{r.active ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3 text-right">
                    <ActionMenu
                      items={[
                        { label: "View card", onClick: () => openCard(r) },
                        { label: "Edit", onClick: () => openEdit(r) },
                        { label: "Add education", onClick: () => openEducation(r) },
                        { label: "Delete", onClick: () => remove(r.id), variant: "danger" },
                      ]}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* -------- Edit / Add modal -------- */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEditOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">
                {editing.id ? "Edit member" : "Add member"}
              </div>
              <button onClick={() => setEditOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Initials</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={editing.initials ?? ""}
                    onChange={(e) => setEditing({ ...editing, initials: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Name *</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Email</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={editing.email ?? ""}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Phone</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Role</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={editing.role ?? ""}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Notes</label>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border px-3 py-2"
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  onClick={saveMember}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- Business card modal -------- */}
      {viewOpen && viewFor && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-2xl border bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-800 px-4 py-3 text-white">
              <div className="text-sm opacity-80">Team member</div>
              <div className="text-xl font-semibold">{viewFor.name}</div>
              <div className="opacity-80">{viewFor.active ? "Active" : "Inactive"}</div>
            </div>

            <div className="space-y-2 p-4 text-sm">
              <div><span className="font-medium">Initials:</span> {viewFor.initials ?? "—"}</div>
              <div><span className="font-medium">Role:</span> {viewFor.role ?? "—"}</div>
              <div><span className="font-medium">Email:</span> {viewFor.email ?? "—"}</div>
              <div><span className="font-medium">Phone:</span> {viewFor.phone ?? "—"}</div>
              <div><span className="font-medium">Notes:</span> {viewFor.notes ?? "—"}</div>

              <div className="mt-3">
                <div className="mb-1 font-medium">Education</div>
                {eduListLoading ? (
                  <div className="text-gray-500">Loading…</div>
                ) : eduList.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {eduList.map((t) => (
                      <li key={t.id}>
                        <span className="font-medium">{t.type ?? "Course"}</span>{" "}
                        {t.certificate_url && (
                          <a
                            className="text-blue-600 underline"
                            href={t.certificate_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            (certificate)
                          </a>
                        )}
                        <div className="text-xs text-gray-600">
                          Awarded: {fmt(t.awarded_on)} · Expires: {fmt(t.expires_on)}
                          {t.notes ? ` · ${t.notes}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">No education records.</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-gray-50 p-3">
              <button
                onClick={() => {
                  setViewOpen(false);
                  openEducation(viewFor);
                }}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-white"
              >
                Add education
              </button>
              <button
                onClick={() => setViewOpen(false)}
                className="rounded-md bg-white px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Education modal -------- */}
      {eduOpen && eduFor && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setEduOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Education · {eduFor.name}</div>
              <button onClick={() => setEduOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Course / Type *</label>
                <input
                  className="h-10 w-full rounded-xl border px-3"
                  value={eduForm.course}
                  onChange={(e) => setEduForm((f) => ({ ...f, course: e.target.value }))}
                  placeholder="e.g., Food Hygiene L2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Provider</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={eduForm.provider}
                    onChange={(e) => setEduForm((f) => ({ ...f, provider: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Certificate URL / ID</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3"
                    value={eduForm.certificateUrl}
                    onChange={(e) => setEduForm((f) => ({ ...f, certificateUrl: e.target.value }))}
                    placeholder="Link or reference"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Completed on</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border px-3"
                    value={eduForm.completedOn}
                    onChange={(e) => setEduForm((f) => ({ ...f, completedOn: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Expiry date</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border px-3"
                    value={eduForm.expiryOn}
                    onChange={(e) => setEduForm((f) => ({ ...f, expiryOn: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Notes</label>
                <textarea
                  className="minh-[90px] w-full rounded-xl border px-3 py-2"
                  value={eduForm.notes}
                  onChange={(e) => setEduForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any extra info…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={() => setEduOpen(false)}>
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                  disabled={eduSaving || !eduForm.course.trim()}
                  onClick={saveEducation}
                >
                  {eduSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
