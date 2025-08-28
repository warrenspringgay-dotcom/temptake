"use client";

import React from "react";
import { createClient } from "@supabase/supabase-js";

/** Supabase browser client */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Staff = {
  id: string;
  initials: string;
  name: string;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
};

type Training = {
  id: string;
  staff_id: string;
  type: string;
  awarded_on?: string | null; // ISO date
  expires_on?: string | null; // ISO date
  certificate_url?: string | null;
  notes?: string | null;
};

type ModalStateStaff =
  | { open: false }
  | { open: true; mode: "add" | "edit"; staff?: Staff };

type ModalStateTraining =
  | { open: false }
  | { open: true; staffId: string; training?: Training };

export default function TeamManagerLocal() {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [trainings, setTrainings] = React.useState<Training[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalStaff, setModalStaff] = React.useState<ModalStateStaff>({ open: false });
  const [modalTraining, setModalTraining] = React.useState<ModalStateTraining>({ open: false });

  async function fetchAll() {
    setLoading(true);
    setError(null);

    const [s1, s2] = await Promise.all([
      supabase.from("staff").select("*").order("name", { ascending: true }),
      supabase.from("trainings").select("*").order("expires_on", { ascending: true }),
    ]);

    if (s1.error) setError(s1.error.message);
    if (s2.error) setError((e) => e ?? s2.error!.message);

    setStaff((s1.data ?? []) as Staff[]);
    setTrainings((s2.data ?? []) as Training[]);

    setLoading(false);
  }

  React.useEffect(() => {
    fetchAll();
  }, []);

  // ----- Staff CRUD -----
  async function upsertStaff(payload: Omit<Staff, "id">, id?: string) {
    if (!id) {
      const { data, error } = await supabase.from("staff").insert(payload).select().single();
      if (error) return setError(error.message);
      setStaff((prev) => [...prev, data as Staff]);
    } else {
      const prev = staff.find((s) => s.id === id);
      if (!prev) return;
      const nextLocal: Staff = { ...prev, ...payload };
      setStaff((prevAll) => prevAll.map((s) => (s.id === id ? nextLocal : s)));
      const { error } = await supabase.from("staff").update(payload).eq("id", id);
      if (error) {
        setError(error.message);
        setStaff((prevAll) => prevAll.map((s) => (s.id === id ? prev : s)));
      }
    }
  }

  async function deleteStaff(id: string) {
    const prevS = staff;
    setStaff((s) => s.filter((x) => x.id !== id));
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setStaff(prevS);
    }
    // trainings cascade (if you defined FK on delete cascade). If not, you may also manually delete trainings here.
  }

  // ----- Training CRUD -----
  async function upsertTraining(payload: Omit<Training, "id">, id?: string) {
    if (!id) {
      const { data, error } = await supabase.from("trainings").insert(payload).select().single();
      if (error) return setError(error.message);
      setTrainings((prev) => [...prev, data as Training]);
    } else {
      const prev = trainings.find((t) => t.id === id);
      if (!prev) return;
      const nextLocal: Training = { ...prev, ...payload };
      setTrainings((prevAll) => prevAll.map((t) => (t.id === id ? nextLocal : t)));
      const { error } = await supabase.from("trainings").update(payload).eq("id", id);
      if (error) {
        setError(error.message);
        setTrainings((prevAll) => prevAll.map((t) => (t.id === id ? prev : t)));
      }
    }
  }

  async function deleteTraining(id: string) {
    const prevT = trainings;
    setTrainings((t) => t.filter((x) => x.id !== id));
    const { error } = await supabase.from("trainings").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setTrainings(prevT);
    }
  }

  // Derived
  const trainingsByStaff = React.useMemo(() => {
    const map = new Map<string, Training[]>();
    for (const t of trainings) {
      const arr = map.get(t.staff_id) ?? [];
      arr.push(t);
      map.set(t.staff_id, arr);
    }
    return map;
  }, [trainings]);

  // Simple KPIs
  const topLogger = "-"; // wire to temp logs later
  const expiringSoon = trainings.filter((t) => isExpiring(t.expires_on, 60)).length;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Team</h1>
        <button
          onClick={() => setModalStaff({ open: true, mode: "add" })}
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add team member
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Team members</div>
          <div className="text-xl font-semibold">{staff.length}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Expiring training (≤60 days)</div>
          <div className="text-xl font-semibold">{expiringSoon}</div>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-3">
          <div className="text-xs text-gray-500">Top logger</div>
          <div className="text-xl font-semibold">{topLogger}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2">Initials</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Job title</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No team members yet.
                </td>
              </tr>
            ) : (
              staff.map((m) => {
                const list = trainingsByStaff.get(m.id) ?? [];
                return (
                  <tr key={m.id} className="border-t align-top">
                    <td className="px-3 py-2">{m.initials}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.email ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">{m.jobTitle ?? ""}</td>
                    <td className="px-3 py-2">
                      <div>{m.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${
                          m.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModalStaff({ open: true, mode: "edit", staff: m })}
                          className="rounded-md border bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
                          title="Edit"
                        >
                          🖉
                        </button>
                        <button
                          onClick={() => deleteStaff(m.id)}
                          className="rounded-md border bg-white px-2 py-1 text-sm text-rose-700 shadow-sm hover:bg-rose-50"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Trainings per member */}
      {staff.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Training</h2>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-1 gap-4">
              {staff.map((m) => {
                const list = trainingsByStaff.get(m.id) ?? [];
                return (
                  <div key={m.id} className="rounded border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">
                        {m.name} <span className="text-gray-400">({m.initials})</span>
                      </div>
                      <button
                        onClick={() => setModalTraining({ open: true, staffId: m.id })}
                        className="rounded-md border bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
                      >
                        + Add training
                      </button>
                    </div>
                    {list.length === 0 ? (
                      <div className="text-sm text-gray-500">No training records.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-700">
                            <tr>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Awarded</th>
                              <th className="px-3 py-2">Expires</th>
                              <th className="px-3 py-2">Certificate</th>
                              <th className="px-3 py-2">Notes</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((t) => (
                              <tr key={t.id} className="border-t">
                                <td className="px-3 py-2">{t.type}</td>
                                <td className="px-3 py-2">{t.awarded_on ?? ""}</td>
                                <td className="px-3 py-2">
                                  <ExpiryBadge date={t.expires_on} />
                                </td>
                                <td className="px-3 py-2">
                                  {t.certificate_url ? (
                                    <a
                                      href={t.certificate_url}
                                      className="text-xs text-blue-600 underline"
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-500">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{t.notes ?? ""}</td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setModalTraining({ open: true, staffId: m.id, training: t })}
                                      className="rounded-md border bg-white px-2 py-1 text-sm shadow-sm hover:bg-gray-50"
                                      title="Edit"
                                    >
                                      🖉
                                    </button>
                                    <button
                                      onClick={() => deleteTraining(t.id)}
                                      className="rounded-md border bg-white px-2 py-1 text-sm text-rose-700 shadow-sm hover:bg-rose-50"
                                      title="Delete"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Staff modal */}
      {modalStaff.open && (
        <StaffModal
          mode={modalStaff.mode}
          staff={modalStaff.mode === "edit" ? modalStaff.staff : undefined}
          onCancel={() => setModalStaff({ open: false })}
          onSave={async (payload) => {
            await upsertStaff(payload, modalStaff.mode === "edit" ? modalStaff.staff?.id : undefined);
            setModalStaff({ open: false });
            await fetchAll();
          }}
        />
      )}

      {/* Training modal */}
      {modalTraining.open && (
        <TrainingModal
          staffId={modalTraining.staffId}
          training={modalTraining.training}
          onCancel={() => setModalTraining({ open: false })}
          onSave={async (payload, id) => {
            await upsertTraining(payload, id);
            setModalTraining({ open: false });
            await fetchAll();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------- Subcomponents ------------------------------ */

function StaffModal(props: {
  mode: "add" | "edit";
  staff?: Staff;
  onCancel: () => void;
  onSave: (payload: Omit<Staff, "id">) => void | Promise<void>;
}) {
  const { mode, staff, onCancel, onSave } = props;
  const [form, setForm] = React.useState<Omit<Staff, "id">>({
    initials: staff?.initials ?? "",
    name: staff?.name ?? "",
    jobTitle: staff?.jobTitle ?? "",
    phone: staff?.phone ?? "",
    email: staff?.email ?? "",
    notes: staff?.notes ?? "",
    active: staff?.active ?? true,
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{mode === "add" ? "Add team member" : "Edit team member"}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Initials</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.initials}
              onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value.toUpperCase() }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Name</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Job title</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.jobTitle ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Phone</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Email</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.trim() }))}
            />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-gray-600">Notes</div>
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          <label className="col-span-full inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onCancel} className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TrainingModal(props: {
  staffId: string;
  training?: Training;
  onCancel: () => void;
  onSave: (payload: Omit<Training, "id">, id?: string) => void | Promise<void>;
}) {
  const { staffId, training, onCancel, onSave } = props;
  const [form, setForm] = React.useState<Omit<Training, "id">>({
    staff_id: staffId,
    type: training?.type ?? "",
    awarded_on: training?.awarded_on ?? "",
    expires_on: training?.expires_on ?? "",
    certificate_url: training?.certificate_url ?? "",
    notes: training?.notes ?? "",
  });

  {/* Modal header */}
<div className="flex items-center justify-between border-b px-4 py-3">
  <h3 className="text-base font-semibold">
    {editingTraining ? "Edit training" : "Add training"}
  </h3>
  <button
    type="button"
    onClick={onCancel}
    className="text-gray-500 hover:text-gray-700"
    aria-label="Close"
  >
    ×
  </button>
</div>