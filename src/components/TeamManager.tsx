// src/components/TeamManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listTeam,
  upsertTeamMember,
  deleteTeamMember,
  ensureStaffByInitials,
  listTrainingsForStaff,
  insertTraining,
  type TeamMember,
  type TrainingRow,
} from "@/app/actions/team";

/* =========================
   Local types (UI-only)
========================= */
type TrainingForm = {
  staffInitials: string;
  type: string;
  awarded_on: string; // yyyy-mm-dd
  expires_on: string; // yyyy-mm-dd
};

type EducationForm = {
  type: string;
  certificate_url: string;
  awarded_on: string; // yyyy-mm-dd
  expires_on: string; // yyyy-mm-dd
  notes: string;
};

/* =========================
   Small helpers
========================= */
function deriveInitials(name?: string | null) {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b || a).toUpperCase();
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* =========================
   Training status utility
========================= */
function statusFromDates(expires_on?: string | null) {
  if (!expires_on) return { label: "—", tone: "muted" as const };

  const today = new Date();
  const exp = new Date(expires_on);
  if (isNaN(exp.getTime())) return { label: "—", tone: "muted" as const };

  const msLeft = exp.getTime() - today.getTime();
  const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: "Expired", tone: "red" as const };
  if (days <= 30) return { label: `Due in ${days}d`, tone: "amber" as const };
  return { label: "OK", tone: "green" as const };
}

/* =========================
   Component
========================= */
export default function TeamManager() {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  // form is partial for easy editing; server action will upsert
  const [form, setForm] = useState<Partial<TeamMember>>({
    name: "",
    role: "",
    email: "",
    phone: "",
    notes: "",
    active: true,
  });

  // View-member modal (with training list)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState<TeamMember | null>(null);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [viewTrainings, setViewTrainings] = useState<TrainingRow[]>([]);
  const [trainSaving, setTrainSaving] = useState(false);

  // Add Education modal (moved out of View modal)
  const [eduOpen, setEduOpen] = useState(false);
  const [eduSaving, setEduSaving] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  const [trainForm, setTrainForm] = useState<TrainingForm>({
    staffInitials: "",
    type: "Level 2 / Induction",
    awarded_on: todayISO,
    expires_on: addDaysISO(todayISO, 365),
  });

  const [eduForm, setEduForm] = useState<EducationForm>({
    type: "Food Hygiene Level 2",
    certificate_url: "",
    awarded_on: todayISO,
    expires_on: addDaysISO(todayISO, 365),
    notes: "",
  });

  async function refresh() {
    setRows(await listTeam());
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.role, r.email, r.phone, r.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);

    const payload: Partial<TeamMember> = {
      id: form.id,
      name: form.name?.trim()!,
      role: form.role ?? null,
      email: form.email ?? null,
      phone: form.phone ?? null,
      notes: form.notes ?? null,
      active: !!form.active,
      initials: deriveInitials(form.name),
    };

    try {
      await upsertTeamMember(payload);
      await refresh();
      setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true });
    } finally {
      setSaving(false);
    }
  }

  function editRow(r: TeamMember) {
    setForm({
      id: r.id,
      name: r.name ?? "",
      role: r.role ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      notes: r.notes ?? "",
      active: r.active ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeRow(id?: string) {
    if (!id) return;
    if (!confirm("Delete this team member?")) return;
    await deleteTeamMember(id);
    await refresh();
  }

  /* -------- View member -------- */
  async function openView(r: TeamMember) {
    const initials = r.initials?.trim() || deriveInitials(r.name);
    const staffId = await ensureStaffByInitials(initials, r.name ?? initials);
    const list = await listTrainingsForStaff(staffId);

    setViewMember(r);
    setViewStaffId(staffId);
    setViewTrainings(list);

    setTrainForm({
      staffInitials: initials,
      type: "Level 2 / Induction",
      awarded_on: todayISO,
      expires_on: addDaysISO(todayISO, 365),
    });

    // Prime education form defaults each time
    setEduForm({
      type: "Food Hygiene Level 2",
      certificate_url: "",
      awarded_on: todayISO,
      expires_on: addDaysISO(todayISO, 365),
      notes: "",
    });

    setViewOpen(true);
  }

  async function refreshTrainingList() {
    if (!viewStaffId) return;
    setViewTrainings(await listTrainingsForStaff(viewStaffId));
  }

  // This is the underlying save pipeline (still inserts into trainings)
  async function addEducation() {
    if (!viewStaffId) return;

    setEduSaving(true);
    try {
      // We store the key bits in existing training schema.
      // If you later add certificate_url/notes columns to insertTraining, wire them here.
      await insertTraining(viewStaffId, {
        type: eduForm.type,
        awarded_on: eduForm.awarded_on,
        expires_on: eduForm.expires_on,
      });

      await refreshTrainingList();
      setEduOpen(false);
    } catch (e: any) {
      alert(`Failed to save education: ${e?.message}`);
    } finally {
      setEduSaving(false);
    }
  }

  // Keep old training add in case you still want it elsewhere, but we won't render it inline.
  async function addTrainingQuick() {
    if (!viewStaffId) return;
    setTrainSaving(true);
    try {
      await insertTraining(viewStaffId, {
        type: trainForm.type,
        awarded_on: trainForm.awarded_on,
        expires_on: trainForm.expires_on,
      });
      await refreshTrainingList();
    } catch (e: any) {
      alert(`Failed to save training: ${e?.message}`);
    } finally {
      setTrainSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header (mobile stacks) */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold sm:text-[18px]">Team</h1>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm sm:w-72"
          />
        </div>
      </div>

      {/* Add/Edit form */}
      <form
        onSubmit={handleSave}
        className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Name *</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              placeholder="e.g. Emma Dundon"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Role</label>
            <input
              value={form.role ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              placeholder="e.g. Manager"
            />
          </div>

          <div className="flex items-end">
            <label className="mr-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              placeholder="e.g. name@company.com"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Phone</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              placeholder="Optional"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs text-gray-500">Notes</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true })}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : null}

          <button
            disabled={saving}
            className={cls(
              "h-10 rounded-xl px-4 text-sm font-medium text-white",
              saving ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {saving ? "Saving…" : form.id ? "Save" : "+ Add member"}
          </button>
        </div>
      </form>

      {/* ====== LIST: Mobile cards (default) ====== */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm md:hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No team members yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filtered.map((r) => {
              const inits = r.initials?.trim() || deriveInitials(r.name);
              return (
                <li key={r.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold">
                          {inits}
                        </span>
                        <div className="truncate text-sm font-medium">
                          {r.name || "—"}
                          <span className="ml-2 text-xs text-gray-500">{r.role || "—"}</span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                        <span className="col-span-2">
                          {r.email || "—"}
                          {r.phone ? <span className="ml-2 text-gray-500">{r.phone}</span> : null}
                        </span>
                        <span className="col-span-2">Notes: {r.notes?.trim() || "—"}</span>
                        <span className="col-span-2">Status: {r.active ? "Active" : "—"}</span>
                      </div>
                    </div>

                    <div className="shrink-0 space-x-2">
                      <button
                        onClick={() => openView(r)}
                        className="h-9 rounded-lg border px-3 text-xs hover:bg-gray-50"
                        aria-label="View member & training"
                      >
                        View
                      </button>
                      <button
                        onClick={() => editRow(r)}
                        className="h-9 rounded-lg border px-3 text-xs hover:bg-gray-50"
                        aria-label="Edit member"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => r.id && removeRow(r.id)}
                        className="h-9 rounded-lg border px-3 text-xs text-red-700 hover:bg-gray-50"
                        aria-label="Delete member"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ====== LIST: Desktop table ====== */}
      <div className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Initials</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Notes</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => {
                  const inits = r.initials?.trim() || deriveInitials(r.name);
                  return (
                    <tr key={r.id} className="border-t align-middle">
                      <td className="py-2 pr-3">{inits || "—"}</td>
                      <td className="py-2 pr-3">{r.name || "—"}</td>
                      <td className="py-2 pr-3">{r.role || "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-col">
                          {r.email ? <span>{r.email}</span> : null}
                          {r.phone ? <span className="text-gray-500">{r.phone}</span> : null}
                          {!r.email && !r.phone ? "—" : null}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{r.notes || "—"}</td>
                      <td className="py-2 pr-3">{r.active ? "Active" : "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openView(r)}
                            className="h-8 rounded-xl border px-3 text-xs hover:bg-gray-50"
                            title="View member & training"
                          >
                            View
                          </button>
                          <button
                            onClick={() => editRow(r)}
                            className="h-8 rounded-xl border px-3 text-xs hover:bg-gray-50"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => r.id && removeRow(r.id)}
                            className="h-8 rounded-xl border px-3 text-xs hover:bg-gray-50"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">
                    No team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Member + Training Modal (full-screen on mobile) */}
      {viewOpen && viewMember && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div
            className="mx-auto h-[100dvh] w-full overflow-auto bg-white sm:mt-16 sm:h-auto sm:max-w-3xl sm:rounded-2xl sm:border sm:p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Sticky header on mobile */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 sm:static sm:px-0 sm:py-0 sm:border-none">
              <div>
                <div className="text-xs text-gray-500">Team member</div>
                <div className="text-base font-semibold">
                  {viewMember.name ?? "—"}{" "}
                  <span className="ml-2 text-xs text-gray-500">
                    ({viewMember.initials?.trim() || deriveInitials(viewMember.name)})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewOpen(false)}
                className="rounded-md p-2 hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Member quick details */}
            <div className="mx-4 my-3 grid grid-cols-1 gap-2 rounded-xl border bg-white p-3 sm:mx-0 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500">Role</div>
                <div className="text-sm">{viewMember.role || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Contact</div>
                <div className="text-sm">
                  {viewMember.email || "—"}
                  {viewMember.phone ? (
                    <span className="ml-2 text-gray-500">{viewMember.phone}</span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="text-sm">{viewMember.active ? "Active" : "—"}</div>
              </div>
            </div>

            {/* Training list */}
            <div className="mx-4 rounded-2xl border bg-white p-3 sm:mx-0">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Training / Education</h4>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshTrainingList}
                    className="h-9 rounded-xl border px-3 text-xs hover:bg-gray-50"
                  >
                    Refresh
                  </button>

                  <button
                    onClick={() => setEduOpen(true)}
                    className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    + Add education
                  </button>
                </div>
              </div>

              {viewTrainings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                  No courses recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-3">Course</th>
                        <th className="py-2 pr-3">Awarded</th>
                        <th className="py-2 pr-3">Expires</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewTrainings.map((t) => {
                        const st = statusFromDates(t.expires_on);
                        const tone =
                          st.tone === "green"
                            ? "bg-emerald-100 text-emerald-800"
                            : st.tone === "amber"
                            ? "bg-amber-100 text-amber-800"
                            : st.tone === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700";

                        return (
                          <tr key={t.id} className="border-t">
                            <td className="py-2 pr-3">{t.type || "—"}</td>
                            <td className="py-2 pr-3">{t.awarded_on || "—"}</td>
                            <td className="py-2 pr-3">{t.expires_on || "—"}</td>
                            <td className="py-2 pr-3">
                              <span className={cls("rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Optional quick-add training (kept but hidden by default) */}
            <div className="mx-4 mt-4 hidden rounded-2xl border bg-white p-3 sm:mx-0">
              <h4 className="mb-2 text-sm font-semibold">Quick add (hidden)</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Type</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={trainForm.type}
                    onChange={(e) => setTrainForm((f) => ({ ...f, type: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Awarded on</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2"
                    value={trainForm.awarded_on}
                    onChange={(e) => setTrainForm((f) => ({ ...f, awarded_on: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Expires on</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2"
                    value={trainForm.expires_on}
                    onChange={(e) => setTrainForm((f) => ({ ...f, expires_on: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={addTrainingQuick}
                  disabled={trainSaving}
                  className={cls(
                    "rounded-xl px-4 py-2 text-sm font-medium text-white",
                    trainSaving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
                  )}
                >
                  {trainSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="h-4" />
          </div>
        </div>
      )}

      {/* Add Education Modal (separate, clean) */}
      {eduOpen && viewMember && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setEduOpen(false)}>
          <div
            className="mx-auto mt-14 w-full max-w-2xl rounded-3xl border bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">Education / Courses</div>
                <div className="text-base font-semibold">
                  Add education for{" "}
                  {viewMember.name ?? "—"}{" "}
                  <span className="text-xs text-gray-500">
                    ({viewMember.initials?.trim() || deriveInitials(viewMember.name)})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEduOpen(false)}
                className="rounded-md p-2 hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Course</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    value={eduForm.type}
                    onChange={(e) => setEduForm((f) => ({ ...f, type: e.target.value }))}
                    placeholder="e.g. Food Hygiene Level 2"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Certificate URL (optional)</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    value={eduForm.certificate_url}
                    onChange={(e) => setEduForm((f) => ({ ...f, certificate_url: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">Awarded on</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    value={eduForm.awarded_on}
                    onChange={(e) => setEduForm((f) => ({ ...f, awarded_on: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">Expires on</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    value={eduForm.expires_on}
                    onChange={(e) => setEduForm((f) => ({ ...f, expires_on: e.target.value }))}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Notes (optional)</label>
                  <input
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    value={eduForm.notes}
                    onChange={(e) => setEduForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEduOpen(false)}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={addEducation}
                  disabled={eduSaving}
                  className={cls(
                    "h-10 rounded-xl px-4 text-sm font-semibold text-white",
                    eduSaving ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {eduSaving ? "Saving…" : "Add education"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
