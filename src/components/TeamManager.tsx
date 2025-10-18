// src/app/team/TeamManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { saveTrainingServer } from "@/app/actions/training"; // <-- plural
import { saveTeamMember, deleteTeamMember, type TeamMemberInput as TeamMemberInputAction } from "@/app/actions/team";

// ----- Types -----
type Member = {
  id: string;
  org_id: string;
  initials: string | null;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean | null;
};

// Use the server's input type, but allow UI-only fields like `notes`
type TeamMemberForm = TeamMemberInputAction & {
  notes?: string | null;
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

export default function TeamManager() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<Member[]>([]);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TeamMemberForm>({
    // ensure fields that must be strings are initialized as strings
    name: "",
    initials: "",
    role: "", // <-- always a string for TS + server
    phone: null,
    email: null,
    active: true,
    training_expires_on: null,
  });

  // training modal
  const [trainOpen, setTrainOpen] = useState(false);
  const [trainFor, setTrainFor] = useState<Member | null>(null);
  const [trainForm, setTrainForm] = useState({
    type: "Food Hygiene L2",
    awarded_on: new Date().toISOString().slice(0, 10),
    expires_on: "",
    certificate_url: "",
    notes: "",
  });

  useEffect(() => {
    (async () => setOrgId(await getOrgIdClient()))();
  }, []);

  async function load() {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("org_id", orgId)
      .order("name");
    if (error) {
      alert(error.message);
      return;
    }
    setRows((data as Member[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.initials, r.name, r.role, r.phone, r.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  function openAdd() {
    setForm({
      name: "",
      initials: "",
      role: "", // keep string
      phone: null,
      email: null,
      active: true,
      training_expires_on: null,
      notes: "", // UI-only
    });
    setModalOpen(true);
  }

  function openEdit(r: Member) {
    setForm({
      id: r.id,
      name: r.name ?? "",
      initials: r.initials ?? "",
      role: r.role ?? "", // ensure string
      phone: r.phone ?? null,
      email: r.email ?? null,
      active: r.active ?? true,
      training_expires_on: null, // keep if you actually store this
      notes: r.notes ?? "", // UI-only
       // safe to pass along if your action accepts it
    });
    setModalOpen(true);
  }

  async function save() {
    try {
      setSaving(true);

      // Build payload matching the action type EXACTLY (no UI-only fields)
      const payload: TeamMemberInputAction = {
        id: form.id,

        name: form.name,
        initials: form.initials,
        role: form.role ?? "", // <-- coerce to string for the action
        email: form.email ?? null,
        phone: form.phone ?? null,
        active: form.active ?? true,
        training_expires_on: form.training_expires_on ?? null,
      };

      await saveTeamMember(payload);
      setModalOpen(false);
      await load();
    } catch (e: any) {
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete member?")) return;
    try {
      await deleteTeamMember(id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  function openTraining(r: Member) {
    setTrainFor(r);
    setTrainForm({
      type: "Food Hygiene L2",
      awarded_on: new Date().toISOString().slice(0, 10),
      expires_on: "",
      certificate_url: "",
      notes: "",
    });
    setTrainOpen(true);
  }

  async function saveTraining() {
    if (!trainFor) return;
    try {
      await saveTrainingServer({
        staffId: trainFor.id, // map team member id as staff
        staffInitials: trainFor.initials ?? undefined,
        type: trainForm.type,
        awarded_on: trainForm.awarded_on,
        expires_on: trainForm.expires_on || undefined,
        certificate_url: trainForm.certificate_url || undefined,
        notes: trainForm.notes || undefined,
      });
      setTrainOpen(false);
    } catch (e: any) {
      alert(e?.message || "Training save failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Team</h1>
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
            + Add member
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Initials</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">{r.initials ?? "—"}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.role ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {[r.email, r.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2 pr-3">{r.active ? "Yes" : "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-md border px-2 text-xs hover:bg-gray-50"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openTraining(r)}
                          className="rounded-md border px-2 text-xs hover:bg-gray-50"
                        >
                          🎓
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="rounded-md border px-2 text-xs hover:bg-gray-50"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setModalOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">{form.id ? "Edit member" : "Add member"}</div>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Initials</label>
                  <input
                    value={form.initials ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value.toUpperCase() }))}
                    className="h-10 w-full rounded-xl border px-3 uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Role</label>
                  <input
                    value={form.role ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Email</label>
                  <input
                    value={form.email ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Phone</label>
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    id="tm-active"
                    type="checkbox"
                    checked={!!form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                  <label htmlFor="tm-active" className="text-sm">
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Notes (UI-only)</label>
                <input
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training modal */}
      {trainOpen && trainFor && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setTrainOpen(false)}>
          <div
            className="mx-auto mt-20 w-full max-w-xl rounded-2xl border bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Add training · {trainFor.name}</div>
              <button onClick={() => setTrainOpen(false)} className="rounded-md p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Type</label>
                <input
                  value={trainForm.type}
                  onChange={(e) => setTrainForm((f) => ({ ...f, type: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Awarded on</label>
                  <input
                    type="date"
                    value={trainForm.awarded_on}
                    onChange={(e) => setTrainForm((f) => ({ ...f, awarded_on: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Expires on (optional)</label>
                  <input
                    type="date"
                    value={trainForm.expires_on}
                    onChange={(e) => setTrainForm((f) => ({ ...f, expires_on: e.target.value }))}
                    className="h-10 w-full rounded-xl border px-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Certificate URL (optional)</label>
                <input
                  value={trainForm.certificate_url}
                  onChange={(e) => setTrainForm((f) => ({ ...f, certificate_url: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">Notes</label>
                <input
                  value={trainForm.notes}
                  onChange={(e) => setTrainForm((f) => ({ ...f, notes: e.target.value }))}
                  className="h-10 w-full rounded-xl border px-3"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setTrainOpen(false)} className="rounded-xl border px-4 py-2 text-sm">
                  Cancel
                </button>
                <button
                  onClick={saveTraining}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                >
                  Save training
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
