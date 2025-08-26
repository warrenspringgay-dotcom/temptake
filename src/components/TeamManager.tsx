"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import NavTabs from "@/components/NavTabs";
import {
  fetchTeam,
  upsertStaff,
  deleteStaff,
  listTrainingTypes,
  upsertTrainingType,
  deleteTrainingType,
  upsertStaffTraining,       // <-- NEW name replaces addStaffTraining
  deleteStaffTraining,
  type StaffRow,
  type TrainingTypeRow,
  type StaffTrainingRow,
} from "@/app/actions/team";

/* ---------- Local helpers (no external imports needed) ---------- */
type ExpiryStatus = "ok" | "warning" | "expired";
function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (expires_on < today) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= warnDays ? "warning" : "ok";
}
function cls(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* ---------- UI atoms ---------- */
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
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cls("rounded-xl border border-gray-200 bg-white", className)}>{children}</div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cls("px-6 py-4 border-b border-gray-200", className)}>{children}</div>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cls("px-6 py-4", className)}>{children}</div>
);
function Badge({ status }: { status: ExpiryStatus }) {
  const map = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    expired: "bg-red-100 text-red-700",
  } as const;
  const label = status === "ok" ? "OK" : status === "warning" ? "Due soon" : "Expired";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{label}</span>;
}

/* ---------- Component ---------- */
export default function TeamManager() {
  const [isPending, startTransition] = useTransition();
  const [team, setTeam] = useState<Array<StaffRow & { trainings: StaffTrainingRow[] }>>([]);
  const [types, setTypes] = useState<TrainingTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [staffModal, setStaffModal] = useState<{ open: boolean; edit?: StaffRow | null }>({ open: false });
  const [typeModal, setTypeModal] = useState<{ open: boolean }>({ open: false });
  const [trainingModal, setTrainingModal] = useState<{ open: boolean; staff?: StaffRow | null; edit?: StaffTrainingRow | null }>({ open: false });

  useEffect(() => {
    (async () => {
      const [t, tt] = await Promise.all([fetchTeam(), listTrainingTypes()]);
      setTeam(t);
      setTypes(tt);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    let expired = 0, warning = 0, total = 0;
    for (const s of team) {
      for (const tr of s.trainings) {
        const st = getExpiryStatus(tr.expires_on, 60);
        total++;
        if (st === "expired") expired++;
        else if (st === "warning") warning++;
      }
    }
    return { expired, warning, total };
  }, [team]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavTabs />

      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Team & Training</h1>
            <p className="text-sm text-slate-600">Add team members; log trainings; track expiries.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTypeModal({ open: true })}>Training types</Button>
            <Button onClick={() => setStaffModal({ open: true })}>+ Add staff</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent><div className="text-xs text-slate-500">Expired</div><div className="text-2xl font-semibold text-red-600">{kpis.expired}</div></CardContent></Card>
          <Card><CardContent><div className="text-xs text-slate-500">Due soon (≤ 60d)</div><div className="text-2xl font-semibold text-amber-600">{kpis.warning}</div></CardContent></Card>
          <Card><CardContent><div className="text-xs text-slate-500">Training records</div><div className="text-2xl font-semibold">{kpis.total}</div></CardContent></Card>
        </div>

        {/* Staff list */}
        <Card>
          <CardHeader><div className="text-sm font-medium">Staff</div></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : team.length === 0 ? (
              <div className="text-sm text-slate-500">No staff yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {team.map((s) => {
                  // worst status across person's trainings
                  let worst: ExpiryStatus = "ok";
                  for (const t of s.trainings) {
                    const st = getExpiryStatus(t.expires_on, 60);
                    if (st === "expired") { worst = "expired"; break; }
                    if (st === "warning") worst = "warning";
                  }
                  return (
                    <li key={s.id} className="py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{s.full_name} {s.initials ? <span className="text-slate-500 font-normal">({s.initials})</span> : null}</div>
                          <div className="text-xs text-slate-500">{s.job_title ?? "—"} {s.active ? "• Active" : "• Inactive"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={worst} />
                          <Button variant="outline" onClick={() => setTrainingModal({ open: true, staff: s, edit: null })}>+ Add training</Button>
                          <Button variant="outline" onClick={() => setStaffModal({ open: true, edit: s })}>Edit</Button>
                          <button
                            className="text-red-600 text-sm hover:underline"
                            onClick={() => {
                              if (!confirm(`Delete ${s.full_name}? This also removes their training records.`)) return;
                              startTransition(async () => {
                                await deleteStaff(s.id);
                                const next = await fetchTeam();
                                setTeam(next);
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Trainings table */}
                      <div className="mt-3 overflow-x-auto">
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
                            {s.trainings.length ? s.trainings.map((t) => {
                              const st = getExpiryStatus(t.expires_on, 60);
                              return (
                                <tr key={t.id} className="border-t border-gray-200">
                                  <td className="py-2 pr-3">{t.training_name ?? "Training"}</td>
                                  <td className="py-2 pr-3">{t.awarded_on}</td>
                                  <td className="py-2 pr-3">{t.expires_on}</td>
                                  <td className="py-2 pr-3"><Badge status={st} /></td>
                                  <td className="py-2 pr-3">
                                    {t.certificate_url ? (
                                      <a href={t.certificate_url} className="text-blue-600 hover:underline" target="_blank">Open</a>
                                    ) : "—"}
                                  </td>
                                  <td className="py-2 pr-3 text-right">
                                    <button className="text-slate-700 hover:underline mr-3" onClick={() => setTrainingModal({ open: true, staff: s, edit: t })}>Edit</button>
                                    <button
                                      className="text-red-600 hover:underline"
                                      onClick={() => {
                                        if (!confirm("Delete training record?")) return;
                                        startTransition(async () => {
                                          await deleteStaffTraining(t.id);
                                          const next = await fetchTeam();
                                          setTeam(next);
                                        });
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            }) : (
                              <tr><td className="py-4 text-slate-500" colSpan={6}>No training records.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Staff modal */}
      {staffModal.open && (
        <StaffModal
          initial={staffModal.edit ?? null}
          onClose={() => setStaffModal({ open: false })}
          onSaved={async () => setTeam(await fetchTeam())}
        />
      )}

      {/* Training type modal */}
      {typeModal.open && (
        <TypeModal
          types={types}
          onClose={() => setTypeModal({ open: false })}
          onChanged={async () => setTypes(await listTrainingTypes())}
        />
      )}

      {/* Training modal */}
      {trainingModal.open && trainingModal.staff && (
        <TrainingModal
          staff={trainingModal.staff}
          initial={trainingModal.edit ?? null}
          types={types}
          onClose={() => setTrainingModal({ open: false, staff: null, edit: null })}
          onSaved={async () => setTeam(await fetchTeam())}
        />
      )}
    </div>
  );
}

/* ---------- Staff modal ---------- */
function StaffModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: StaffRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    full_name: initial?.full_name ?? "",
    initials: initial?.initials ?? "",
    job_title: initial?.job_title ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="text-sm font-medium">{form.id ? "Edit staff" : "Add staff"}</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name *</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Initials</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.initials ?? ""} onChange={e=>setForm({...form, initials: e.target.value.toUpperCase()})}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Job title</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.job_title ?? ""} onChange={e=>setForm({...form, job_title: e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.phone ?? ""} onChange={e=>setForm({...form, phone: e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.email ?? ""} onChange={e=>setForm({...form, email: e.target.value})}/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Notes</label>
            <textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.notes ?? ""} onChange={e=>setForm({...form, notes: e.target.value})}/>
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active: e.target.checked})}/>
              Active
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.full_name.trim()) { alert("Name is required."); return; }
              startTransition(async () => {
                await upsertStaff(form);
                await onSaved();
                onClose();
              });
            }}
            disabled={isPending}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Training type modal ---------- */
function TypeModal({
  types,
  onClose,
  onChanged,
}: {
  types: TrainingTypeRow[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [list, setList] = useState<TrainingTypeRow[]>(types);
  const [newName, setNewName] = useState("");

  useEffect(() => { setList(types); }, [types]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="text-sm font-medium">Training types</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex gap-2">
            <input className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Add a training type…" value={newName} onChange={(e)=>setNewName(e.target.value)} />
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                startTransition(async () => {
                  await upsertTrainingType(newName.trim());
                  setNewName("");
                  await onChanged();
                });
              }}
              disabled={isPending}
            >
              Add
            </Button>
          </div>

          <ul className="divide-y divide-gray-200">
            {list.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between">
                <div className="text-sm">{t.name}</div>
                <button
                  className="text-red-600 text-sm hover:underline"
                  onClick={() => {
                    if (!confirm(`Delete type "${t.name}"?`)) return;
                    startTransition(async () => {
                      await deleteTrainingType(t.name);
                      await onChanged();
                    });
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 text-right">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Training modal ---------- */
function TrainingModal({
  staff,
  initial,
  types,
  onClose,
  onSaved,
}: {
  staff: StaffRow;
  initial: StaffTrainingRow | null;
  types: TrainingTypeRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    training_type_id: initial?.training_type_id ?? "",
    training_type_name: initial?.training_name ?? "",
    awarded_on: initial?.awarded_on ?? new Date().toISOString().slice(0, 10),
    expires_on: initial?.expires_on ?? new Date().toISOString().slice(0, 10),
    certificate_url: initial?.certificate_url ?? "",
    notes: initial?.notes ?? "",
  });

  const canSave = !!(form.training_type_id || form.training_type_name) && !!form.awarded_on && !!form.expires_on;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="text-sm font-medium">
            {initial ? `Edit training for ${staff.full_name}` : `Add training for ${staff.full_name}`}
          </div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Training type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={form.training_type_id}
                onChange={(e) => setForm({ ...form, training_type_id: e.target.value, training_type_name: "" })}
              >
                <option value="">— select existing —</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="…or type a new training name"
                value={form.training_type_name}
                onChange={(e) => setForm({ ...form, training_type_name: e.target.value, training_type_id: "" })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Awarded on</label>
            <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.awarded_on} onChange={(e)=>setForm({...form, awarded_on: e.target.value})}/>
          </div>
          <div>
            <label className="block text-sm mb-1">Expires on</label>
            <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.expires_on} onChange={(e)=>setForm({...form, expires_on: e.target.value})}/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Certificate URL</label>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="https://…" value={form.certificate_url} onChange={(e)=>setForm({...form, certificate_url: e.target.value})}/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Notes</label>
            <textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})}/>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!canSave) { alert("Select a training type or enter a new one, and set dates."); return; }
              startTransition(async () => {
                await upsertStaffTraining({
                  id: form.id,
                  staff_id: staff.id,
                  training_type_id: form.training_type_id || undefined,
                  training_type_name: form.training_type_name || undefined,
                  awarded_on: form.awarded_on,
                  expires_on: form.expires_on,
                  certificate_url: form.certificate_url || null,
                  notes: form.notes || null,
                });
                await onSaved();
                onClose();
              });
            }}
            disabled={isPending || !canSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
