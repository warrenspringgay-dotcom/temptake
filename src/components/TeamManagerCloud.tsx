// src/components/TeamManagerCloud.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/** ───────── Types ───────── */
type Training = {
  id: string;
  created_by: string | null;
  staff_id: string;
  type: string;
  awarded_on: string; // YYYY-MM-DD
  expires_on: string; // YYYY-MM-DD
  certificate_url?: string | null;
  notes?: string | null;
};

type Staff = {
  id: string;
  created_by: string | null;
  initials: string;
  name: string;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
};

type StaffWithTrainings = Staff & { trainings: Training[] };

/** ───────── Utils ───────── */
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

type ExpiryStatus = "ok" | "warning" | "expired";
function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const t = today();
  if (expires_on < t) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const now = new Date(t + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  return diff <= warnDays ? "warning" : "ok";
}

function downloadICS(events: Array<{ title: string; date: string }>, filename = "training-expiries.ics") {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TempTake//Team//EN"];
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (() => {
    const d = new Date();
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
      d.getUTCMinutes()
    )}${pad(d.getUTCSeconds())}Z`;
  })();
  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${crypto?.randomUUID ? crypto.randomUUID() : uid()}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ev.date.replace(/-/g, "")}`,
      `SUMMARY:${ev.title.replace(/([,;])/g, "\\$1")}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Badge({ status }: { status: ExpiryStatus }) {
  const map = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    expired: "bg-red-100 text-red-700",
  } as const;
  const label = status === "ok" ? "OK" : status === "warning" ? "Due soon" : "Expired";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{label}</span>;
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
      : "text-slate-700 hover:bg-gray-100";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

/** ───────── Cloud helpers ───────── */

/** Read staff + trainings using RLS (no uid filter; RLS scopes rows) */
async function fetchTeam(): Promise<StaffWithTrainings[]> {
  // Staff
  const { data: staff, error: e1, status: s1 } = await supabase
    .from("team_members")
    .select("*")
    .order("name", { ascending: true });

  if (e1) {
    const err = new Error(formatSupabaseError("team_members", e1, s1));
    (err as any)._raw = e1;
    throw err;
  }

  // Trainings
  const { data: trainings, error: e2, status: s2 } = await supabase
    .from("trainings")
    .select("*")
    .order("expires_on", { ascending: true });

  if (e2) {
    const err = new Error(formatSupabaseError("trainings", e2, s2));
    (err as any)._raw = e2;
    throw err;
  }

  const tByStaff = new Map<string, Training[]>();
  for (const t of trainings ?? []) {
    const arr = tByStaff.get(t.staff_id) ?? [];
    arr.push(t as Training);
    tByStaff.set(t.staff_id, arr);
  }
  return (staff ?? []).map((s) => ({ ...(s as Staff), trainings: tByStaff.get(s.id) ?? [] }));
}

/** Create/update staff (sets created_by to auth uid) */
async function upsertStaffCloud(draft: Omit<Staff, "id" | "created_by"> & { id?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to add staff.");
  const payload = {
    id: draft.id ?? undefined,
    created_by: auth.user.id,
    initials: draft.initials.toUpperCase(),
    name: draft.name,
    job_title: draft.job_title ?? null,
    phone: draft.phone ?? null,
    email: draft.email ?? null,
    notes: draft.notes ?? null,
    active: draft.active ?? true,
    updated_at: new Date().toISOString(),
  };
  const { data, error, status } = await supabase.from("team_members").upsert(payload).select().single();
  if (error) throw new Error(formatSupabaseError("team_members.upsert", error, status));
  return data as Staff;
}

async function deleteStaffCloud(id: string) {
  const { error, status } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(formatSupabaseError("team_members.delete", error, status));
}

async function upsertTrainingCloud(draft: Omit<Training, "id" | "created_by"> & { id?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to add training.");
  const payload = {
    id: draft.id ?? undefined,
    created_by: auth.user.id,
    staff_id: draft.staff_id,
    type: draft.type,
    awarded_on: draft.awarded_on,
    expires_on: draft.expires_on,
    certificate_url: draft.certificate_url ?? null,
    notes: draft.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error, status } = await supabase.from("trainings").upsert(payload).select().single();
  if (error) throw new Error(formatSupabaseError("trainings.upsert", error, status));
  return data as Training;
}

async function deleteTrainingCloud(id: string) {
  const { error, status } = await supabase.from("trainings").delete().eq("id", id);
  if (error) throw new Error(formatSupabaseError("trainings.delete", error, status));
}

/** Nicely format Supabase/PostgREST errors */
function formatSupabaseError(scope: string, error: any, status?: number) {
  const parts = [
    `[${scope}]`,
    status ? `status=${status}` : null,
    error?.message ? `message=${error.message}` : null,
    error?.code ? `code=${error.code}` : null,
    error?.hint ? `hint=${error.hint}` : null,
    error?.details ? `details=${error.details}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return parts || `[${scope}] Unknown error`;
}

/** ───────── Component ───────── */
export default function TeamManagerCloud() {
  const [staff, setStaff] = useState<StaffWithTrainings[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const [staffModal, setStaffModal] = useState<{ open: boolean; edit?: StaffWithTrainings | null }>({
    open: false,
  });
  const [trainingModal, setTrainingModal] = useState<{ open: boolean; staffId?: string; edit?: Training | null }>({
    open: false,
  });

  // Observe auth so we can show a clear message if signed out
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setSignedIn(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => {
      sub.subscription.unsubscribe();
      cancelled = true;
    };
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const list = await fetchTeam();
      setStaff(list);
    } catch (e: any) {
      // Show a helpful message
      const msg = e?.message || "Failed to load team.";
      setErr(msg);
      // Still log raw error details in devtools
      // eslint-disable-next-line no-console
      console.error("Team load error:", e?._raw || e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const allTrainings = useMemo(
    () => staff.flatMap((s) => s.trainings.map((t) => ({ s, t }))),
    [staff]
  );
  const stats = useMemo(() => {
    let expired = 0,
      warning = 0;
    for (const { t } of allTrainings) {
      const st = getExpiryStatus(t.expires_on, 60);
      if (st === "expired") expired++;
      else if (st === "warning") warning++;
    }
    return { expired, warning, total: allTrainings.length };
  }, [allTrainings]);

  const leaderboard: Array<{ initials: string; name: string; count: number }> = [];

  async function saveStaff(draft: Omit<Staff, "id" | "created_by"> & { id?: string; trainings?: Training[] }) {
    try {
      const saved = await upsertStaffCloud(draft);
      setStaff((prev) => {
        const exists = prev.find((x) => x.id === saved.id);
        if (exists) return prev.map((x) => (x.id === saved.id ? { ...x, ...saved } : x));
        return [{ ...(saved as Staff), trainings: [] }, ...prev].sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (e: any) {
      const raw = e?.message || "";
      const isDup = /initials/i.test(raw) && /unique|duplicate/i.test(raw);
      alert(isDup ? "Initials must be unique in your account." : `Save failed: ${raw}`);
    }
  }

  async function removeStaff(id: string) {
    if (!confirm("Delete this staff member (and their trainings)?")) return;
    await deleteStaffCloud(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  async function saveTraining(staffId: string, draft: Omit<Training, "id" | "created_by"> & { id?: string }) {
    const saved = await upsertTrainingCloud(draft);
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        const list = s.trainings ?? [];
        const idx = list.findIndex((x) => x.id === saved.id);
        const next = idx >= 0 ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list];
        return { ...s, trainings: next.sort((a, b) => a.expires_on.localeCompare(b.expires_on)) };
      })
    );
  }

  async function removeTraining(staffId: string, trainingId: string) {
    await deleteTrainingCloud(trainingId);
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, trainings: s.trainings.filter((t) => t.id !== trainingId) } : s))
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Team & Training</h1>
            <p className="text-sm text-slate-600">Cloud-backed via Supabase (RLS per account).</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const events = allTrainings
                  .filter(({ t }) => getExpiryStatus(t.expires_on, 365) !== "ok")
                  .map(({ s, t }) => ({ title: `${s.name} – ${t.type} expires`, date: t.expires_on }));
                if (!events.length) {
                  alert("No upcoming/overdue expiries.");
                  return;
                }
                downloadICS(events, "training-expiries.ics");
              }}
            >
              Export .ics
            </Button>
            <Button onClick={() => setStaffModal({ open: true })}>+ Add staff</Button>
          </div>
        </div>

        {/* Clear messages */}
        {!signedIn && signedIn !== null ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            You’re not signed in. Please log in to view your team.
          </div>
        ) : null}

        {err ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{err}</div>
        ) : null}


        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Expired</div>
            <div className="text-2xl font-semibold text-red-600">{loading ? "…" : stats.expired}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Due soon (≤ 60d)</div>
            <div className="text-2xl font-semibold text-amber-600">{loading ? "…" : stats.warning}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total training records</div>
            <div className="text-2xl font-semibold">{loading ? "…" : stats.total}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium">Top loggers</div>
            <ol className="mt-2 space-y-1 text-sm">
              {leaderboard.length ? (
                leaderboard.slice(0, 5).map((u, i) => (
                  <li key={u.initials} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs">{i + 1}</span>
                      <span className="font-medium">{u.name}</span>
                      <span className="text-slate-500">({u.initials})</span>
                    </div>
                    <span className="tabular-nums">{u.count}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">—</li>
              )}
            </ol>
          </div>
        </div>

        {/* Staff list */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">Staff</div>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          ) : !staff.length ? (
            <div className="p-6 text-center text-sm text-slate-500">No staff yet. Add your first person.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {staff.map((s) => {
                let worst: ExpiryStatus = "ok";
                for (const t of s.trainings) {
                  const st = getExpiryStatus(t.expires_on, 60);
                  if (st === "expired") {
                    worst = "expired";
                    break;
                  }
                  if (st === "warning") worst = "warning";
                }
                return (
                  <li key={s.id} className="p-4">
                    <details>
                      <summary className="flex items-center justify-between cursor-pointer">
                        <div className="min-w-0">
                          <div className="font-medium">
                            {s.name} <span className="text-slate-500 font-normal">({s.initials})</span>
                            {s.job_title ? <span className="text-slate-500 font-normal"> — {s.job_title}</span> : null}
                          </div>
                          <div className="text-xs text-slate-500">{s.active ? "Active" : "Inactive"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={worst} />
                        </div>
                      </summary>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="text-sm">
                          <div className="text-slate-500 text-xs">Phone</div>
                          <div>{s.phone || "—"}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-slate-500 text-xs">Email</div>
                          <div>{s.email || "—"}</div>
                        </div>
                        <div className="text-right">
                          <Button variant="outline" onClick={() => setTrainingModal({ open: true, staffId: s.id })}>
                            + Add training
                          </Button>
                          <Button variant="outline" className="ml-2" onClick={() => setStaffModal({ open: true, edit: s })}>
                            Edit
                          </Button>
                          <button
                            className="ml-3 text-red-600 text-sm hover:underline"
                            onClick={() => removeStaff(s.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-slate-600">
                            <tr>
                              <th className="py-2 pr-3">Training</th>
                              <th className="py-2 pr-3">Awarded</th>
                              <th className="py-2 pr-3">Expires</th>
                              <th className="py-2 pr-3">Status</th>
                              <th className="py-2 pr-3">Certificate</th>
                              <th className="py-2 pr-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.trainings.length ? (
                              s.trainings.map((t) => {
                                const st = getExpiryStatus(t.expires_on, 60);
                                return (
                                  <tr key={t.id} className="border-t border-gray-200">
                                    <td className="py-2 pr-3">{t.type}</td>
                                    <td className="py-2 pr-3">{t.awarded_on}</td>
                                    <td className="py-2 pr-3">{t.expires_on}</td>
                                    <td className="py-2 pr-3">
                                      <Badge status={st} />
                                    </td>
                                    <td className="py-2 pr-3">
                                        {t.certificate_url ? (
                                          <a className="text-blue-600 hover:underline" href={t.certificate_url} target="_blank">
                                            Open
                                          </a>
                                        ) : "—"}
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                      <button
                                        className="text-slate-700 hover:underline mr-3"
                                        onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: t })}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="text-red-600 hover:underline"
                                        onClick={() => removeTraining(s.id, t.id)}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td className="py-4 text-slate-500" colSpan={6}>
                                  No training records.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {staffModal.open && (
        <StaffModal
          initial={staffModal.edit ?? null}
          onClose={() => setStaffModal({ open: false })}
          onSave={saveStaff}
          allStaff={staff}
        />
      )}
      {trainingModal.open && trainingModal.staffId && (
        <TrainingModal
          staff={staff.find((s) => s.id === trainingModal.staffId)!}
          initial={trainingModal.edit ?? null}
          onClose={() => setTrainingModal({ open: false })}
          onSave={(t) => saveTraining(trainingModal.staffId!, { ...t, staff_id: trainingModal.staffId! })}
        />
      )}
    </div>
  );

  // Modals (inline to keep it single-file)
  function StaffModal({
    initial,
    onClose,
    onSave,
    allStaff,
  }: {
    initial: StaffWithTrainings | null;
    onClose: () => void;
    onSave: (s: Omit<Staff, "id" | "created_by"> & { id?: string }) => void;
    allStaff: StaffWithTrainings[];
  }) {
    const [form, setForm] = useState({
      id: initial?.id ?? undefined,
      initials: initial?.initials ?? "",
      name: initial?.name ?? "",
      job_title: initial?.job_title ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      notes: initial?.notes ?? "",
      active: initial?.active ?? true,
    });

    function submit() {
      if (!form.initials.trim() || !form.name.trim()) {
        alert("Initials and Name are required.");
        return;
      }
      const clash = allStaff.find(
        (s) => s.initials.toUpperCase() === form.initials.toUpperCase() && s.id !== form.id
      );
      if (clash) {
        alert("Initials must be unique.");
        return;
      }
      onSave({ ...form, initials: form.initials.toUpperCase() });
      onClose();
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="text-sm font-medium">{form.id ? "Edit staff" : "Add staff"}</div>
            <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Initials *</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                value={form.initials}
                onChange={(e) => setForm({ ...form, initials: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Job title</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </div>
        </div>
      </div>
    );
  }

  function TrainingModal({
    staff,
    initial,
    onClose,
    onSave,
  }: {
    staff: StaffWithTrainings;
    initial: Training | null;
    onClose: () => void;
    onSave: (t: Omit<Training, "id" | "created_by"> & { id?: string }) => void;
  }) {
    const [form, setForm] = useState({
      id: initial?.id ?? undefined,
      type: initial?.type ?? "Food Hygiene Level 2",
      awarded_on: initial?.awarded_on ?? today(),
      expires_on: initial?.expires_on ?? today(),
      certificate_url: initial?.certificate_url ?? "",
      notes: initial?.notes ?? "",
    });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="text-sm font-medium">{initial ? `Edit training for ${staff.name}` : `Add training for ${staff.name}`}</div>
            <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm mb-1">Training type</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Awarded on</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.awarded_on}
                onChange={(e) => setForm({ ...form, awarded_on: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Expires on</label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.expires_on}
                onChange={(e) => setForm({ ...form, expires_on: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Certificate URL</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://…"
                value={form.certificate_url}
                onChange={(e) => setForm({ ...form, certificate_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => { onSave(form as any); onClose(); }}>Save</Button>
          </div>
        </div>
      </div>
    );
  }
}
