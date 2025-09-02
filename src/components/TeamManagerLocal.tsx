"use client";

import React from "react";


/* ============================ Types ============================ */

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

/* ============================ Helpers ============================ */

const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

type ExpiryStatus = "ok" | "warning" | "expired";
function getExpiryStatus(expires_on: string, warnDays = 60): ExpiryStatus {
  if (!expires_on) return "ok";
  const t = today();
  if (expires_on < t) return "expired";
  const d = new Date(expires_on + "T00:00:00Z");
  const now = new Date(t + "T00:00:00Z");
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  return diff <= warnDays ? "warning" : "ok";
}

function useLocalState<T>(key: string, init: T) {
  const [state, setState] = React.useState<T>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as T) : init;
    } catch {
      return init;
    }
  });
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

/* ============================ Tiny UI Primitives ============================ */

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost" | "danger";
  }
) {
  const { variant = "primary", className = "", ...rest } = props;
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "outline"
      ? "border border-gray-300 bg-white text-slate-900 hover:bg-gray-50"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "text-slate-700 hover:bg-gray-100";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full rounded border px-2 py-1 text-sm ${className}`}
      {...rest}
    />
  );
}

function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { className = "", ...rest } = props;
  return <label className={`block text-xs font-medium text-gray-600 ${className}`} {...rest} />;
}

function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props;
  return <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`} {...rest} />;
}

function Badge({ status }: { status: ExpiryStatus }) {
  const cls =
    status === "ok"
      ? "bg-green-100 text-green-800"
      : status === "warning"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-700";
  const label = status === "ok" ? "OK" : status === "warning" ? "Due soon" : "Expired";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/40">
      <div className="absolute left-1/2 top-1/2 z-50 w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">{title}</div>
          <button
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ============================ Main Component ============================ */

export default function TeamManagerLocal() {
  // Stored locally so you can test w/o auth
  const [staff, setStaff] = useLocalState<Staff[]>("tt_staff", []);
  const [logs] = useLocalState<LocalLog[]>("tt_logs", []);

  // Derived: flatten trainings
  const allTrainings = React.useMemo(
    () => staff.flatMap((s) => s.trainings.map((t) => ({ s, t }))),
    [staff]
  );

  // KPIs
  const stats = React.useMemo(() => {
    let expired = 0;
    let warning = 0;
    for (const { t } of allTrainings) {
      const st = getExpiryStatus(t.expires_on, 60);
      if (st === "expired") expired++;
      else if (st === "warning") warning++;
    }
    return { expired, warning, total: allTrainings.length, staffCount: staff.length };
  }, [allTrainings, staff.length]);

  const leaderboard = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) {
      const init = String(l.initials || "").toUpperCase();
      if (!init || init === "GUEST") continue;
      counts.set(init, (counts.get(init) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([initials, count]) => {
      const person = staff.find((s) => s.initials.toUpperCase() === initials);
      return { initials, name: person?.name ?? initials, count };
    });
    return rows.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs, staff]);

  // Modals state
  const [staffModal, setStaffModal] = React.useState<{ open: boolean; edit?: Staff | null }>({
    open: false,
    edit: null,
  });
  const [trainingModal, setTrainingModal] = React.useState<{
    open: boolean;
    staffId?: string;
    edit?: Training | null;
  }>({ open: false });

  /* ----------------------- CRUD helpers (local) ---------------------- */

  function saveStaff(
    draft: Omit<Staff, "id" | "trainings"> & { id?: string; trainings?: Training[] }
  ) {
    setStaff((prev) => {
      const exists = draft.id ? prev.find((s) => s.id === draft.id) : undefined;
      const payload: Staff = exists
        ? {
            ...exists,
            ...draft,
            initials: (draft.initials || exists.initials).toUpperCase(),
            trainings: draft.trainings ?? exists.trainings,
          }
        : {
            id: uid(),
            initials: (draft.initials || "").toUpperCase(),
            name: draft.name,
            jobTitle: draft.jobTitle ?? "",
            phone: draft.phone ?? "",
            email: draft.email ?? "",
            notes: draft.notes ?? "",
            active: draft.active,
            trainings: draft.trainings ?? [],
          };
      const list = exists
        ? prev.map((s) => (s.id === payload.id ? payload : s))
        : [payload, ...prev];
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
        const nextItem: Training = { id: draft.id ?? uid(), ...draft };
        const list = s.trainings ?? [];
        const idx = list.findIndex((x) => x.id === nextItem.id);
        const next =
          idx >= 0 ? list.map((x) => (x.id === nextItem.id ? nextItem : x)) : [nextItem, ...list];
        return { ...s, trainings: next.sort((a, b) => a.expires_on.localeCompare(b.expires_on)) };
      })
    );
  }

  function removeTraining(staffId: string, trainingId: string) {
    setStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, trainings: s.trainings.filter((t) => t.id !== trainingId) } : s
      )
    );
  }

  /* ----------------------------- Render ----------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Team & Training</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStaffModal({ open: true, edit: null })}
              aria-label="Add team member"
            >
              + Add team member
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Card>
            <div className="text-xs text-gray-500">Team members</div>
            <div className="mt-1 text-2xl font-semibold">{stats.staffCount}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Qualifications</div>
            <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Due soon</div>
            <div className="mt-1 text-2xl font-semibold text-amber-700">{stats.warning}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Expired</div>
            <div className="mt-1 text-2xl font-semibold text-red-700">{stats.expired}</div>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <div className="mb-2 text-sm font-semibold">Top loggers (last sync from local logs)</div>
          {leaderboard.length === 0 ? (
            <div className="text-sm text-gray-500">No logging data yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {leaderboard.map((row) => (
                <div
                  key={row.initials}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.initials}</div>
                  </div>
                  <div className="text-lg font-semibold">{row.count}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Staff table */}
        <section className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-semibold">Team</div>
            <Button variant="outline" onClick={() => setStaffModal({ open: true, edit: null })}>
              + Add
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-3 py-2">Initials</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-gray-500" colSpan={7}>
                      No team members yet.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => {
                    // worst training status for row badge
                    const worst: ExpiryStatus =
                      s.trainings.reduce<ExpiryStatus>((acc, t) => {
                        const st = getExpiryStatus(t.expires_on);
                        const rank = (v: ExpiryStatus) => (v === "expired" ? 2 : v === "warning" ? 1 : 0);
                        return rank(st) > rank(acc) ? st : acc;
                      }, "ok") ?? "ok";

                    return (
                      <tr key={s.id} className="border-t align-top">
                        <td className="px-3 py-2">{s.initials}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2">{s.jobTitle ?? "—"}</td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-700">{s.email || "—"}</div>
                          <div className="text-xs text-gray-500">{s.phone || "—"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="mb-1">
                            <Badge status={worst} />
                          </div>
                          <div className="text-xs">{s.active ? "Active" : "Inactive"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-[260px] truncate">{s.notes ?? "—"}</div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: null })}
                            >
                              + Training
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setStaffModal({ open: true, edit: s })}
                            >
                              Edit
                            </Button>
                            <Button variant="danger" onClick={() => removeStaff(s.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Trainings per staff */}
          {staff.length > 0 && (
            <div className="border-t p-3">
              <div className="mb-2 text-sm font-semibold">Training by member</div>
              <div className="space-y-4">
                {staff.map((s) => (
                  <div key={s.id} className="rounded border">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <div className="text-sm font-medium">
                        {s.name} <span className="text-gray-400">({s.initials})</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: null })}
                      >
                        + Add training
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[780px] w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                          <tr>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Awarded</th>
                            <th className="px-3 py-2">Expires</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Certificate</th>
                            <th className="px-3 py-2">Notes</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.trainings.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-sm text-gray-500" colSpan={7}>
                                No trainings recorded.
                              </td>
                            </tr>
                          ) : (
                            s.trainings.map((t) => (
                              <tr key={t.id} className="border-t">
                                <td className="px-3 py-2">{t.type}</td>
                                <td className="px-3 py-2">{t.awarded_on || "—"}</td>
                                <td className="px-3 py-2">{t.expires_on || "—"}</td>
                                <td className="px-3 py-2">
                                  <Badge status={getExpiryStatus(t.expires_on)} />
                                </td>
                                <td className="px-3 py-2">
                                  {t.certificate_url ? (
                                    <a
                                      className="text-blue-600 underline"
                                      href={t.certificate_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="max-w-[260px] truncate">{t.notes ?? "—"}</div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="inline-flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setTrainingModal({ open: true, staffId: s.id, edit: t })}
                                    >
                                      Edit
                                    </Button>
                                    <Button variant="danger" onClick={() => removeTraining(s.id, t.id)}>
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Staff Modal */}
      <StaffModal
        open={staffModal.open}
        edit={staffModal.edit ?? null}
        onClose={() => setStaffModal({ open: false, edit: null })}
        onSave={saveStaff}
      />

      {/* Training Modal */}
      <TrainingModal
        open={trainingModal.open}
        staff={staff}
        staffId={trainingModal.staffId}
        edit={trainingModal.edit ?? null}
        onClose={() => setTrainingModal({ open: false })}
        onSave={saveTraining}
      />
    </div>
  );
}

/* ============================ Modals ============================ */

function StaffModal({
  open,
  edit,
  onClose,
  onSave,
}: {
  open: boolean;
  edit: Staff | null;
  onClose: () => void;
  onSave: (draft: Omit<Staff, "id" | "trainings"> & { id?: string; trainings?: Training[] }) => void;
}) {
  const [form, setForm] = React.useState<Omit<Staff, "id" | "trainings"> & { id?: string; trainings?: Training[] }>({
    id: undefined,
    initials: "",
    name: "",
    jobTitle: "",
    phone: "",
    email: "",
    notes: "",
    active: true,
    trainings: [],
  });

  React.useEffect(() => {
    if (edit) {
      setForm({
        id: edit.id,
        initials: edit.initials,
        name: edit.name,
        jobTitle: edit.jobTitle ?? "",
        phone: edit.phone ?? "",
        email: edit.email ?? "",
        notes: edit.notes ?? "",
        active: !!edit.active,
        trainings: edit.trainings ?? [],
      });
    } else {
      setForm({
        id: undefined,
        initials: "",
        name: "",
        jobTitle: "",
        phone: "",
        email: "",
        notes: "",
        active: true,
        trainings: [],
      });
    }
  }, [edit]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      initials: (form.initials ?? "").toUpperCase(),
      name: (form.name ?? "").trim(),
    };
    onSave(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit team member" : "Add team member"}>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={submit}>
        <div>
          <Label>Initials</Label>
          <Input
            value={form.initials}
            onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value }))}
            placeholder="WS"
            required
          />
        </div>
        <div>
          <Label>Full name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Warren Springgay"
            required
          />
        </div>
        <div>
          <Label>Job title</Label>
          <Input
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            placeholder="Chef / Manager"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+44 ..."
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="name@example.com"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{edit ? "Save changes" : "Add member"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TrainingModal({
  open,
  staff,
  staffId,
  edit,
  onClose,
  onSave,
}: {
  open: boolean;
  staff: Staff[];
  staffId?: string;
  edit: Training | null;
  onClose: () => void;
  onSave: (staffId: string, draft: Omit<Training, "id"> & { id?: string }) => void;
}) {
  const [form, setForm] = React.useState<Omit<Training, "id"> & { id?: string }>({
    id: undefined,
    type: "",
    awarded_on: today(),
    expires_on: today(),
    certificate_url: "",
    notes: "",
  });
  const [forStaff, setForStaff] = React.useState<string>("");

  React.useEffect(() => {
    setForStaff(staffId ?? "");
  }, [staffId]);

  React.useEffect(() => {
    if (edit) {
      setForm({
        id: edit.id,
        type: edit.type,
        awarded_on: edit.awarded_on,
        expires_on: edit.expires_on,
        certificate_url: edit.certificate_url ?? "",
        notes: edit.notes ?? "",
      });
    } else {
      setForm({
        id: undefined,
        type: "",
        awarded_on: today(),
        expires_on: today(),
        certificate_url: "",
        notes: "",
      });
    }
  }, [edit]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!forStaff) return;
    onSave(forStaff, {
      id: form.id,
      type: (form.type ?? "").trim(),
      awarded_on: form.awarded_on,
      expires_on: form.expires_on,
      certificate_url: (form.certificate_url ?? "").trim() || undefined,
      notes: (form.notes ?? "").trim() || undefined,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit training" : "Add training"}>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={submit}>
        <div className="sm:col-span-2">
          <Label>Team member</Label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={forStaff}
            onChange={(e) => setForStaff(e.target.value)}
            required
          >
            <option value="" disabled>
              Select person…
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.initials})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Training type</Label>
          <Input
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            placeholder="Level 2 Food Hygiene"
            required
          />
        </div>
        <div>
          <Label>Awarded on</Label>
          <Input
            type="date"
            value={form.awarded_on}
            onChange={(e) => setForm((f) => ({ ...f, awarded_on: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label>Expires on</Label>
          <Input
            type="date"
            value={form.expires_on}
            onChange={(e) => setForm((f) => ({ ...f, expires_on: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label>Certificate URL</Label>
          <Input
            type="url"
            value={form.certificate_url}
            onChange={(e) => setForm((f) => ({ ...f, certificate_url: e.target.value }))}
            placeholder="https://…"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>

        <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{edit ? "Save changes" : "Add training"}</Button>
        </div>
      </form>
    </Modal>
  );
}
