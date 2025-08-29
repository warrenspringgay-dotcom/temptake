// src/components/TeamManagerLocal.tsx
"use client";

import React from "react";
import {
  fetchTeam,
  upsertStaff,
  deleteStaff,
  listTrainingTypes,
  upsertTrainingType,
  deleteTrainingType,
  upsertStaffTraining,
  deleteStaffTraining,
  loggingLeaderboard,
  listExpiringWithin,
  type StaffRow,
  type TrainingTypeRow,
  type StaffTrainingRow,
} from "@/app/actions/team";
import { getExpiryStatus, type ExpiryStatus } from "@/lib/training";

/* --------------------------------------------------------------------------------
   Small UI helpers
-------------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const { className = "", variant = "primary", ...rest } = props;
  const styles =
    variant === "primary"
      ? "bg-amber-500 hover:bg-amber-600 text-white"
      : variant === "danger"
      ? "bg-red-500 hover:bg-red-600 text-white"
      : "hover:bg-gray-100";
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${styles} ${className}`}
    />
  );
}

/* --------------------------------------------------------------------------------
   Team Manager (client)
-------------------------------------------------------------------------------- */

export default function TeamManagerLocal() {
  const [loading, setLoading] = React.useState(true);

  // current data
  const [team, setTeam] = React.useState<Array<StaffRow & { trainings: StaffTrainingRow[] }>>([]);
  const [types, setTypes] = React.useState<TrainingTypeRow[]>([]);

  // UI state
  const [staffForm, setStaffForm] = React.useState<Partial<StaffRow>>({});
  const [trainingForm, setTrainingForm] = React.useState<{
    id?: string;
    staff_id?: string;
    training_type_id?: string;
    training_type_name?: string;
    obtained_on?: string | null;
    expires_on?: string | null;
    certificate_url?: string | null;
    notes?: string | null;
  }>({});

  // load data (NOTE: fetchTeam returns an array now)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, tt] = await Promise.all([fetchTeam(), listTrainingTypes()]);
        if (!mounted) return;
        setTeam(t);
        setTypes(tt);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------- Staff CRUD handlers --------------------------- */

  async function onSaveStaff() {
    if (!staffForm.full_name || staffForm.full_name.trim() === "") return;
    const res = await upsertStaff({
      id: staffForm.id,
      full_name: staffForm.full_name.trim(),
      initials: (staffForm.initials ?? "").trim() || null,
      email: (staffForm.email ?? "").trim() || null,
      phone: (staffForm.phone ?? "").trim() || null,
      notes: (staffForm.notes ?? "").trim() || null,
    });

    // reload team to reflect changes
    const t = await fetchTeam();
    setTeam(t);
    setStaffForm({});
  }

  async function onDeleteStaff(id: string) {
    if (!confirm("Delete this staff member (and all of their training records)?")) return;
    await deleteStaff(id);
    const t = await fetchTeam();
    setTeam(t);
  }

  /* ------------------------ Training Type CRUD handlers ---------------------- */

  const [newTypeName, setNewTypeName] = React.useState("");
  async function onAddType() {
    if (!newTypeName.trim()) return;
    await upsertTrainingType(newTypeName.trim());
    setNewTypeName("");
    const tt = await listTrainingTypes();
    setTypes(tt);
  }

  async function onDeleteType(name: string) {
    if (!confirm(`Delete training type "${name}"?`)) return;
    await deleteTrainingType(name);
    const tt = await listTrainingTypes();
    setTypes(tt);
  }

  /* ---------------------- Staff training CRUD handlers ----------------------- */

  async function onSaveTraining() {
    if (!trainingForm.staff_id) return;
    await upsertStaffTraining({
      id: trainingForm.id,
      staff_id: trainingForm.staff_id,
      training_type_id: trainingForm.training_type_id,
      training_type_name: trainingForm.training_type_name?.trim(),
      obtained_on: trainingForm.obtained_on ?? null,
      expires_on: trainingForm.expires_on ?? null,
      certificate_url: trainingForm.certificate_url ?? null,
      notes: trainingForm.notes ?? null,
    });
    const t = await fetchTeam();
    setTeam(t);
    setTrainingForm({});
  }

  async function onDeleteTraining(rec: StaffTrainingRow) {
    if (!confirm("Delete this training record?")) return;
    await deleteStaffTraining(rec.id);
    const t = await fetchTeam();
    setTeam(t);
  }

  /* --------------------------- Derived / reporting --------------------------- */

  const [leader, setLeader] = React.useState<{ initials: string; count: number } | null>(null);
  const [expiring, setExpiring] = React.useState<
    Array<{ staffName: string; trainingName: string; expiresOn: string }>
  >([]);

  React.useEffect(() => {
    (async () => {
      try {
        const [lb, ex] = await Promise.all([loggingLeaderboard(90), listExpiringWithin(60)]);
        setLeader(lb[0] ?? null);
        setExpiring(ex);
      } catch (e) {
        // not fatal
        console.warn(e);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading team…</div>;
  }

  /* ---------------------------------- UI ------------------------------------ */

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Team size</div>
          <div className="mt-1 text-2xl font-semibold">{team.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Top logger (90d)</div>
          <div className="mt-1 text-lg font-semibold">
            {leader ? `${leader.initials} – ${leader.count}` : "—"}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Expiring soon (≤ 60 days)</div>
          <div className="mt-1 text-2xl font-semibold">{expiring.length}</div>
        </div>
      </div>

      {/* Staff list */}
      <Section title="Staff">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-2 py-2 text-left font-semibold">Name</th>
                <th className="px-2 py-2 text-left font-semibold">Initials</th>
                <th className="px-2 py-2 text-left font-semibold">Email</th>
                <th className="px-2 py-2 text-left font-semibold">Phone</th>
                <th className="px-2 py-2 text-left font-semibold">Notes</th>
                <th className="px-2 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-2 py-2">{s.full_name}</td>
                  <td className="px-2 py-2">{s.initials ?? "—"}</td>
                  <td className="px-2 py-2">{s.email ?? "—"}</td>
                  <td className="px-2 py-2">{s.phone ?? "—"}</td>
                  <td className="px-2 py-2">
                    <span className="inline-block max-w-[260px] truncate" title={s.notes ?? ""}>
                      {s.notes ?? "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      variant="ghost"
                      onClick={() => setStaffForm(s)}
                      className="mr-2"
                      title="Edit staff"
                    >
                      ✎ Edit
                    </Button>
                    <Button variant="danger" onClick={() => onDeleteStaff(s.id)} title="Delete">
                      🗑 Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-center text-gray-500" colSpan={6}>
                    No staff yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Staff form */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Full name"
            value={staffForm.full_name ?? ""}
            onChange={(e) => setStaffForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Initials (AB)"
            value={staffForm.initials ?? ""}
            onChange={(e) => setStaffForm((f) => ({ ...f, initials: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Email"
            value={staffForm.email ?? ""}
            onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Phone"
            value={staffForm.phone ?? ""}
            onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2 sm:col-span-2"
            placeholder="Notes"
            value={staffForm.notes ?? ""}
            onChange={(e) => setStaffForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Button onClick={onSaveStaff}>{staffForm.id ? "Save changes" : "Add staff"}</Button>
            {staffForm.id && (
              <Button variant="ghost" className="ml-2" onClick={() => setStaffForm({})}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Section>

      {/* Training types */}
      <Section title="Training types">
        <div className="flex flex-wrap items-center gap-2">
          {types.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            >
              {t.name}
              <button
                onClick={() => onDeleteType(t.name)}
                className="text-gray-500 hover:text-red-600"
                title="Remove type"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-md border px-3 py-2"
            placeholder="New type name (e.g., Food Hygiene L2)"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
          />
          <Button onClick={onAddType}>Add type</Button>
        </div>
      </Section>

      {/* Training records editor */}
      <Section title="Training records">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            className="rounded-md border px-3 py-2"
            value={trainingForm.staff_id ?? ""}
            onChange={(e) => setTrainingForm((f) => ({ ...f, staff_id: e.target.value || undefined }))}
          >
            <option value="">Select staff…</option>
            {team.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.initials ? `(${s.initials})` : ""}
              </option>
            ))}
          </select>

          {/* Either choose an existing type or type a new name */}
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border px-3 py-2"
              value={trainingForm.training_type_id ?? ""}
              onChange={(e) =>
                setTrainingForm((f) => ({
                  ...f,
                  training_type_id: e.target.value || undefined,
                  training_type_name: undefined,
                }))
              }
            >
              <option value="">Type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="…or new type name"
              value={trainingForm.training_type_name ?? ""}
              onChange={(e) =>
                setTrainingForm((f) => ({
                  ...f,
                  training_type_name: e.target.value || undefined,
                  training_type_id: undefined,
                }))
              }
            />
          </div>

          <input
            type="date"
            className="rounded-md border px-3 py-2"
            value={trainingForm.obtained_on ?? ""}
            onChange={(e) => setTrainingForm((f) => ({ ...f, obtained_on: e.target.value || null }))}
          />
          <input
            type="date"
            className="rounded-md border px-3 py-2"
            value={trainingForm.expires_on ?? ""}
            onChange={(e) => setTrainingForm((f) => ({ ...f, expires_on: e.target.value || null }))}
          />
          <input
            className="rounded-md border px-3 py-2 sm:col-span-2"
            placeholder="Certificate URL"
            value={trainingForm.certificate_url ?? ""}
            onChange={(e) =>
              setTrainingForm((f) => ({ ...f, certificate_url: e.target.value || null }))
            }
          />
          <input
            className="rounded-md border px-3 py-2 sm:col-span-2"
            placeholder="Notes"
            value={trainingForm.notes ?? ""}
            onChange={(e) => setTrainingForm((f) => ({ ...f, notes: e.target.value || null }))}
          />

          <div className="sm:col-span-2">
            <Button onClick={onSaveTraining}>{trainingForm.id ? "Save record" : "Add record"}</Button>
            {trainingForm.id && (
              <Button variant="ghost" className="ml-2" onClick={() => setTrainingForm({})}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* List per-staff records */}
        <div className="mt-6 space-y-6">
          {team.map((s) => (
            <div key={s.id} className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-base font-semibold">
                  {s.full_name} {s.initials ? `(${s.initials})` : ""}
                </h3>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Obtained</th>
                      <th className="px-2 py-2 text-left">Expires</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Cert</th>
                      <th className="px-2 py-2 text-left">Notes</th>
                      <th className="px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.trainings.length === 0 ? (
                      <tr>
                        <td className="px-2 py-3 text-center text-gray-500" colSpan={7}>
                          No training yet.
                        </td>
                      </tr>
                    ) : (
                      s.trainings.map((a) => {
                        const status: ExpiryStatus = getExpiryStatus(a.expires_on ?? "");
                        const badge =
                          status === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700";
                        return (
                          <tr key={a.id} className="border-b last:border-0">
                            <td className="px-2 py-2">
                              {
                                types.find((t) => t.id === a.training_type_id)?.name ??
                                a.training_type_id
                              }
                            </td>
                            <td className="px-2 py-2">{a.obtained_on ?? "—"}</td>
                            <td className="px-2 py-2">{a.expires_on ?? "—"}</td>
                            <td className="px-2 py-2">
                              <span className={`rounded px-2 py-0.5 text-xs ${badge}`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {a.certificate_url ? (
                                <a
                                  href={a.certificate_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-700 underline"
                                >
                                  View
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className="inline-block max-w-[280px] truncate"
                                title={a.notes ?? ""}
                              >
                                {a.notes ?? "—"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Button
                                variant="ghost"
                                className="mr-2"
                                title="Edit"
                                onClick={() =>
                                  setTrainingForm({
                                    id: a.id,
                                    staff_id: s.id,
                                    training_type_id: a.training_type_id,
                                    obtained_on: a.obtained_on,
                                    expires_on: a.expires_on,
                                    certificate_url: a.certificate_url,
                                    notes: a.notes,
                                  })
                                }
                              >
                                ✎
                              </Button>
                              <Button variant="danger" onClick={() => onDeleteTraining(a)} title="Delete">
                                🗑
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
