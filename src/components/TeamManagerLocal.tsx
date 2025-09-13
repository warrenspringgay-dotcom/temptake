"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";

/* ---------- Types ---------- */
type Training = {
  id: string;
  type: string;
  awarded_on: string;
  expires_on: string;
  certificate_url?: string;
  notes?: string;
};
type Staff = {
  id: string;
  initials: string;
  name: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  trainings: Training[];
};
type LocalLog = { initials?: string };

/* ---------- Utils ---------- */
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

type ExpiryStatus = "ok" | "warning" | "expired";
function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const t = today();
  if (expires_on < t) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const now = new Date(t + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= warnDays ? "warning" : "ok";
}
function useLocalState<T>(key: string, init: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState] as const;
}

/* ---------- Tiny UI ---------- */
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

/* ---------- Main ---------- */
export default function TeamManagerLocal() {
  const [staff, setStaff] = useLocalState<Staff[]>("tt_staff", []);
  const [logs] = useLocalState<LocalLog[]>("tt_logs", []);

  const allTrainings = useMemo(
    () => staff.flatMap((s) => s.trainings.map((t) => ({ s, t }))),
    [staff]
  );

  // KPIs: expired / due soon / total
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

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) {
      const init = String(l.initials || "").toUpperCase();
      if (!init || init === "GUEST") continue;
      counts.set(init, (counts.get(init) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([initials, count]) => {
        const person = staff.find((s) => s.initials.toUpperCase() === initials);
        return { initials, name: person?.name ?? initials, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [logs, staff]);

  const [staffModal, setStaffModal] = useState<{ open: boolean; edit?: Staff | null }>({
    open: false,
  });
  const [trainingModal, setTrainingModal] = useState<{ open: boolean; staffId?: string; edit?: Training | null }>({
    open: false,
  });

  function saveStaff(
    draft: Omit<Staff, "id" | "trainings"> & { id?: string; trainings?: Training[] }
  ) {
    setStaff((prev) => {
      const exists = draft.id ? prev.find((s) => s.id === draft.id) : undefined;
      const payload: Staff = exists
        ? { ...exists, ...draft, trainings: draft.trainings ?? exists.trainings }
        : {
            id: uid(),
            initials: draft.initials.toUpperCase(),
            name: draft.name,
            jobTitle: draft.jobTitle ?? "",
            phone: draft.phone ?? "",
            email: draft.email ?? "",
            notes: draft.notes ?? "",
            active: draft.active,
            trainings: draft.trainings ?? [],
          };
      const list = exists ? prev.map((s) => (s.id === payload.id ? payload : s)) : [
        payload,
        ...prev,
      ];
      return list.sort((a, b) => a.name.localeCompare(b.name));
    });
  }
  function removeStaff(id: string) {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  }
  function saveTraining(staffId: string, draft: Omit<Training, "id"> & { id?: string }) {
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        const t: Training = { id: draft.id ?? uid(), ...draft };
        const list = s.trainings ?? [];
        const idx = list.findIndex((x) => x.id === t.id);
        const next = idx >= 0 ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list];
        return {
          ...s,
          trainings: next.sort((a, b) => a.expires_on.localeCompare(b.expires_on)),
        };
      })
    );
  }
  function removeTraining(staffId: string, trainingId: string) {
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, trainings: s.trainings.filter((t) => t.id !== trainingId) } : s))
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Team & Training (local)</h1>
            <p className="text-sm text-slate-600">
              Add staff so they can log temperatures (the logger checks initials against this list).
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setStaffModal({ open: true })}>+ Add staff</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Expired</div>
            <div className="text-2xl font-semibold text-red-600">{stats.expired}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Due soon (≤ 60d)</div>
            <div className="text-2xl font-semibold text-amber-600">{stats.warning}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total training records</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
        </div>

        {/* Staff list */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium">Staff</div>
          {staff.length === 0 ? (
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
                      <summary className="flex cursor-pointer items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium">
                            {s.name}{" "}
                            <span className="font-normal text-slate-500">({s.initials})</span>
                            {s.jobTitle ? (
                              <span className="font-normal text-slate-500"> — {s.jobTitle}</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">{s.active ? "Active" : "Inactive"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={worst} />
                          <span className="text-xs text-slate-600 underline">More info</span>
                        </div>
                      </summary>

                      {/* Staff basics + actions */}
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="text-sm">
                          <div className="text-xs text-slate-500">Phone</div>
                          <div>{s.phone || "—"}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-xs text-slate-500">Email</div>
                          <div>{s.email || "—"}</div>
                        </div>
                        <div className="text-right">
                          <Button variant onClick={() => setStaffModal({ open: true, edit: s })}>
                            ✏️
                          </Button>
                          <button
                            className="ml-3 text-sm text-red-600 hover:underline"
                            onClick={() => {
                              if (confirm("Delete this staff member?")) removeStaff(s.id);
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Training table */}
                      <div className="mt-4 overflow-x-auto">
                        <div className="mb-2 text-right">
                          <Button onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: null })}>
                            + Add training
                          </Button>
                        </div>
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
                                        <a
                                          className="text-blue-600 hover:underline"
                                          href={t.certificate_url}
                                          target="_blank"
                                        >
                                          Open
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                      <button
                                        className="text-sm text-slate-800 underline"
                                        onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: t })}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="ml-3 text-sm text-red-600 underline"
                                        onClick={() => removeTraining(s.id, t.id)}
                                      >
                                        🗑️
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
          onSave={(s) => saveStaff(s)}
          allStaff={staff}
        />
      )}

      {trainingModal.open && trainingModal.staffId && (
        <TrainingModal
          staff={staff.find((x) => x.id === trainingModal.staffId)!}
          initial={trainingModal.edit ?? null}
          onClose={() => setTrainingModal({ open: false })}
          onSave={(t) => {
            saveTraining(trainingModal.staffId!, t);
            setTrainingModal({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* ---------- Modals ---------- */
function StaffModal({
  initial,
  onClose,
  onSave,
  allStaff,
}: {
  initial: Staff | null;
  onClose: () => void;
  onSave: (s: Omit<Staff, "id" | "trainings"> & { id?: string; trainings?: Training[] }) => void;
  allStaff: Staff[];
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    initials: initial?.initials ?? "",
    name: initial?.name ?? "",
    jobTitle: initial?.jobTitle ?? "",
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
  function onNotesKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="text-sm font-medium">{form.id ? "Edit staff" : "Add staff"}</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Initials *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.initials}
              onChange={(e) => setForm({ ...form, initials: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Name *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Job title</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Phone</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              onKeyDown={onNotesKeyDown}
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
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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
  staff: Staff;
  initial: Training | null;
  onClose: () => void;
  onSave: (t: Omit<Training, "id"> & { id?: string }) => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    type: initial?.type ?? "Food Hygiene Level 2",
    awarded_on: initial?.awarded_on ?? today(),
    expires_on: initial?.expires_on ?? today(),
    certificate_url: initial?.certificate_url ?? "",
    notes: initial?.notes ?? "",
  });

  function submit() {
    if (!form.type.trim()) {
      alert("Training type is required.");
      return;
    }
    onSave(form);
  }
  function onNotesKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="text-sm font-medium">
            {initial ? `Edit training for ${staff.name}` : `Add training for ${staff.name}`}
          </div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 px-6 py-4">
          <div>
            <label className="mb-1 block text-sm">Training type</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Awarded on</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.awarded_on}
              onChange={(e) => setForm({ ...form, awarded_on: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Expires on</label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.expires_on}
              onChange={(e) => setForm({ ...form, expires_on: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Certificate URL</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="https://…"
              value={form.certificate_url}
              onChange={(e) => setForm({ ...form, certificate_url: e.target.value })}
              onKeyDown={onNotesKeyDown}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Notes</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              onKeyDown={onNotesKeyDown}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </div>
      </div>
    </div>
  );
}
