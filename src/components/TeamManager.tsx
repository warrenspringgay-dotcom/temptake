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

  // Education / Courses should be added while editing a member (not in view modal)
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [editTrainings, setEditTrainings] = useState<TrainingRow[]>([]);
  const [eduLoading, setEduLoading] = useState(false);
  const [eduSaving, setEduSaving] = useState(false);
  const [eduForm, setEduForm] = useState<TrainingForm>({
    staffInitials: "",
    type: "Level 2 / Induction",
    awarded_on: new Date().toISOString().slice(0, 10),
    expires_on: addDaysISO(new Date().toISOString().slice(0, 10), 365),
  });

  // View-member modal (read-only training)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState<TeamMember | null>(null);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [viewTrainings, setViewTrainings] = useState<TrainingRow[]>([]);

  async function refresh() {
    setRows(await listTeam());
  }

  function resetEducation() {
    setEditStaffId(null);
    setEditTrainings([]);
    setEduLoading(false);
    setEduSaving(false);
    setEduForm({
      staffInitials: "",
      type: "Level 2 / Induction",
      awarded_on: new Date().toISOString().slice(0, 10),
      expires_on: addDaysISO(new Date().toISOString().slice(0, 10), 365),
    });
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
      resetEducation();
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
    void loadEditEducation(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeRow(id?: string) {
    if (!id) return;
    if (!confirm("Delete this team member?")) return;
    await deleteTeamMember(id);
    await refresh();
  }

  /* -------- View member (read-only training) -------- */
  async function openView(r: TeamMember) {
    const initials = r.initials?.trim() || deriveInitials(r.name);
    const staffId = await ensureStaffByInitials(initials, r.name ?? initials);

    const list = await listTrainingsForStaff(staffId);

    setViewMember(r);
    setViewStaffId(staffId);
    setViewTrainings(list);
    setViewOpen(true);
  }

  async function loadEditEducation(member: TeamMember) {
    const initials = member.initials?.trim() || deriveInitials(member.name);
    const staffId = await ensureStaffByInitials(initials, member.name ?? initials);

    setEduLoading(true);
    try {
      const list = await listTrainingsForStaff(staffId);
      setEditStaffId(staffId);
      setEditTrainings(list);
      setEduForm({
        staffInitials: initials,
        type: "Level 2 / Induction",
        awarded_on: new Date().toISOString().slice(0, 10),
        expires_on: addDaysISO(new Date().toISOString().slice(0, 10), 365),
      });
    } finally {
      setEduLoading(false);
    }
  }

  async function addEducation() {
    if (!editStaffId) return;
    setEduSaving(true);
    try {
      await insertTraining(editStaffId, {
        type: eduForm.type,
        awarded_on: eduForm.awarded_on,
        expires_on: eduForm.expires_on,
      });
      setEditTrainings(await listTrainingsForStaff(editStaffId));
    } catch (e: any) {
      alert(`Failed to save education: ${e?.message}`);
    } finally {
      setEduSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header (mobile stacks) */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h1 className="text-lg font-semibold sm:text-[18px]">Team</h1>
        <div className="flex w-full flex-col items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
          <a
            href="/reports"
            className="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm hover:bg-gray-50"
          >
            View reports →
          </a>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 sm:w-64"
          />
        </div>
      </div>

      {/* Editor */}
      <form
        onSubmit={handleSave}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Alex Brown"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Role</label>
            <input
              value={form.role ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g., Chef / Manager"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Phone</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+44…"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@company.com"
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-500">Notes</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Allergens, schedule, etc."
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
        </div>

        {/* Education / Courses (add here, not in view modal) */}
        {form.id ? (
          <div className="mt-4 rounded-2xl border bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Education / Courses</h4>
              <button
                type="button"
                onClick={async () => {
                  const m = rows.find((x) => x.id === form.id);
                  if (m) await loadEditEducation(m);
                }}
                disabled={eduLoading}
                className="h-8 rounded-xl border px-3 text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                {eduLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {editTrainings.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                No courses recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Awarded</th>
                      <th className="py-2 pr-3">Expires</th>
                      <th className="py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editTrainings.map((t) => {
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

            {/* Add education */}
            <div className="mt-4 rounded-xl border bg-white p-3">
              <h4 className="mb-2 text-sm font-semibold">Add education</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Type</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={eduForm.type}
                    onChange={(e) => setEduForm((f) => ({ ...f, type: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Awarded on</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2"
                    value={eduForm.awarded_on}
                    onChange={(e) => setEduForm((f) => ({ ...f, awarded_on: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Expires on</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border px-3 py-2"
                    value={eduForm.expires_on}
                    onChange={(e) => setEduForm((f) => ({ ...f, expires_on: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={addEducation}
                  disabled={eduSaving || !editStaffId}
                  className={cls(
                    "rounded-xl px-4 py-2 text-sm font-medium text-white",
                    eduSaving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
                  )}
                >
                  {eduSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || !form.name?.trim()}
            className={cls(
              "h-10 rounded-xl px-4 text-sm font-medium text-white",
              saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
            )}
          >
            {form.id ? "Update member" : "Add member"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => {
                setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true });
                resetEducation();
              }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
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
                <h4 className="text-sm font-semibold">Training history</h4>
              </div>

              {viewTrainings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                  No training records yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-3">Type</th>
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

            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
