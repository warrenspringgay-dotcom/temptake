// src/components/TeamManager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* =========================
   Types
========================= */
type TeamMember = {
  id?: string;
  org_id?: string | null;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean | null;
  initials?: string | null;
};

type TrainingRow = {
  id: string;
  type: string | null;
  awarded_on: string | null;  // yyyy-mm-dd
  expires_on: string | null;  // yyyy-mm-dd
  certificate_url?: string | null;
  notes?: string | null;
};

type TrainingForm = {
  staffInitials: string;
  type: string;
  awarded_on: string;
  expires_on: string;
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
   Supabase helpers
========================= */
async function listTeamSafe(): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("listTeamSafe:", error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

async function upsertTeamSafe(payload: Partial<TeamMember>) {
  try {
    const { error } = await supabase.from("team_members").upsert(payload);
    if (error) console.error("upsertTeamSafe:", error.message);
  } catch {}
}

async function deleteTeamSafe(id: string) {
  try {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) console.error("deleteTeamSafe:", error.message);
  } catch {}
}

/** Ensure there is a staff row for the given initials; return its id. */
async function ensureStaffByInitials(initials: string, fallbackName?: string): Promise<string> {
  const ini = initials.trim().toUpperCase();
  if (!ini) throw new Error("Missing initials");

  // Try existing
  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("initials", ini)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create minimal staff row (your staff.name is NOT NULL)
  const { data: created, error } = await supabase
    .from("staff")
    .insert({ initials: ini, name: fallbackName ?? ini })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create staff: ${error.message}`);
  if (!created?.id) throw new Error("Could not resolve staff id");
  return created.id;
}

/** Read all trainings for a given staffId, newest first. */
async function listTrainingsForStaff(staffId: string): Promise<TrainingRow[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select("id,type,awarded_on,expires_on,certificate_url,notes")
    .eq("staff_id", staffId)
    .order("awarded_on", { ascending: false });

  if (error) {
    console.error("listTrainingsForStaff:", error.message);
    return [];
  }
  return (data ?? []) as TrainingRow[];
}

/** Insert a training row. */
async function insertTraining(staffId: string, input: Omit<TrainingForm, "staffInitials">) {
  const payload = {
    staff_id: staffId,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on: input.expires_on,
  };
  const { error } = await supabase.from("trainings").insert(payload);
  if (error) throw new Error(error.message);
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

  const [form, setForm] = useState<TeamMember>({
    name: "",
    role: "",
    email: "",
    phone: "",
    notes: "",
    active: true,
  });

  // View-member modal (with training)
  const [viewOpen, setViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState<TeamMember | null>(null);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [viewTrainings, setViewTrainings] = useState<TrainingRow[]>([]);
  const [trainSaving, setTrainSaving] = useState(false);

  const [trainForm, setTrainForm] = useState<TrainingForm>({
    staffInitials: "",
    type: "Level 2 / Induction",
    awarded_on: new Date().toISOString().slice(0, 10),
    expires_on: addDaysISO(new Date().toISOString().slice(0, 10), 365),
  });

  useEffect(() => {
    (async () => setRows(await listTeamSafe()))();
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
      name: form.name?.trim(),
      role: form.role ?? null,
      email: form.email ?? null,
      phone: form.phone ?? null,
      notes: form.notes ?? null,
      active: !!form.active,
      initials: deriveInitials(form.name),
    };

    await upsertTeamSafe(payload);
    setRows(await listTeamSafe());
    setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true });
    setSaving(false);
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
    await deleteTeamSafe(id);
    setRows(await listTeamSafe());
  }

  /* -------- View member (with training) -------- */
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
      awarded_on: new Date().toISOString().slice(0, 10),
      expires_on: addDaysISO(new Date().toISOString().slice(0, 10), 365),
    });
    setViewOpen(true);
  }

  async function addTraining() {
    if (!viewStaffId) return;
    setTrainSaving(true);
    try {
      await insertTraining(viewStaffId, {
        type: trainForm.type,
        awarded_on: trainForm.awarded_on,
        expires_on: trainForm.expires_on,
      });
      setViewTrainings(await listTrainingsForStaff(viewStaffId));
    } catch (e: any) {
      alert(`Failed to save training: ${e?.message}`);
    } finally {
      setTrainSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[18px] font-semibold">Team</h1>
        <a href="/reports" className="ml-auto text-sm text-blue-600 hover:underline">
          View reports →
        </a>
        <div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-8 w-[220px] rounded-lg border border-gray-200 bg-white px-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Editor */}
      <form onSubmit={handleSave} className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Alex Brown"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Role</label>
            <input
              value={form.role ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g., Chef / Manager"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <label htmlFor="active" className="text-sm">Active</label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Phone</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+44…"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@company.com"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-500">Notes</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Allergens, schedule, etc."
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.name?.trim()}
            className={cls(
              "h-9 rounded-xl px-4 text-sm font-medium text-white",
              saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
            )}
          >
            {form.id ? "Update member" : "Add member"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() =>
                setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true })
              }
              className="h-9 rounded-xl border border-gray-200 bg-white px-4 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                            title="View member & training"
                          >
                            View
                          </button>
                          <button
                            onClick={() => editRow(r)}
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => r.id && removeRow(r.id)}
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
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

      {/* View Member + Training Modal */}
      {viewOpen && viewMember && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setViewOpen(false)}>
          <div
            className="mx-auto mt-16 w-full max-w-3xl rounded-2xl border bg-white p-4 shadow-sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Team member</div>
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
            <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border bg-white p-3 sm:grid-cols-3">
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
            <div className="rounded-2xl border bg-white p-3">
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

            {/* Add training inline */}
            <div className="mt-4 rounded-2xl border bg-white p-3">
              <h4 className="mb-2 text-sm font-semibold">Add training</h4>
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
                  onClick={addTraining}
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
          </div>
        </div>
      )}
    </div>
  );
}
