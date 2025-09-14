// src/components/TeamTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ---------------- Types ---------------- */
type TeamMember = {
  id?: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  active?: boolean;
  status?: string; // e.g. "OK"
  initials?: string;
};

/* ---------------- Helpers ---------------- */
const emptyToUndef = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t ? t : undefined;
};
const uid = () => Math.random().toString(36).slice(2);

function deriveInitials(name?: string) {
  if (!name?.trim()) return "";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b || a).toUpperCase();
}

async function listTeamSafe(): Promise<TeamMember[]> {
  try {
    const res = await fetch("/api/team", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
async function upsertTeamSafe(payload: Partial<TeamMember>) {
  try {
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {}
}
async function deleteTeamSafe(id: string) {
  try {
    await fetch(`/api/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {}
}

/* ---------------- Small UI ---------------- */
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

/* ---------------- Component ---------------- */
export default function TeamTable() {
  const [rows, setRows] = useState<TeamMember[]>([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing?: TeamMember | null }>({ open: false });

  useEffect(() => {
    (async () => setRows(await listTeamSafe()))();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) =>
      [r.name, r.role, r.email, r.phone, r.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    );
  }, [rows, q]);

  async function save(payload: Omit<TeamMember, "id"> & { id?: string }) {
    // IMPORTANT: do not send display_name — the API type doesn’t allow it.
    const out: Partial<TeamMember> = {
      id: payload.id,
      name: emptyToUndef(payload.name) ?? "",
      role: emptyToUndef(payload.role),
      email: emptyToUndef(payload.email),
      phone: emptyToUndef(payload.phone),
      notes: emptyToUndef(payload.notes),
      active: payload.active ?? true,
      status: payload.status ?? "OK",
      initials: emptyToUndef(payload.initials) ?? deriveInitials(payload.name),
    };

    await upsertTeamSafe(out);
    setRows(await listTeamSafe());
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete this team member?")) return;
    await deleteTeamSafe(id);
    setRows(await listTeamSafe());
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Team</div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-8 w-56 rounded-md border border-gray-300 px-2 text-sm"
          />
          <Button onClick={() => setModal({ open: true, editing: null })}>+ Add member</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-3">Initials</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Contact</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((r) => {
                const inits = r.initials?.trim() || deriveInitials(r.name);
                return (
                  <tr key={r.id ?? r.name} className="border-t border-gray-200">
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
                    <td className="py-2 pr-3">{r.status ?? "OK"}</td>
                    <td className="py-2 pr-3">{r.active ? "Yes" : "—"}</td>
                    <td className="py-2 pr-3 text-right">
                      <Button variant="outline" onClick={() => setModal({ open: true, editing: r })}>
                        ✏️
                      </Button>
                      <button
                        className="ml-3 text-sm text-red-600 underline"
                        onClick={() => remove(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-6 text-center text-gray-500" colSpan={7}>
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <TeamModal
          initial={modal.editing ?? null}
          onClose={() => setModal({ open: false })}
          onSave={async (p) => {
            await save(p);
            setModal({ open: false });
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Modal ---------------- */
function TeamModal({
  initial,
  onClose,
  onSave,
}: {
  initial: TeamMember | null;
  onClose: () => void;
  onSave: (p: Omit<TeamMember, "id"> & { id?: string }) => void;
}) {
  const [form, setForm] = useState({
    id: initial?.id ?? undefined,
    name: initial?.name ?? "",
    initials: initial?.initials ?? "",
    role: initial?.role ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
    status: initial?.status ?? "OK",
  });

  function submit() {
    if (!form.name.trim()) {
      alert("Name is required.");
      return;
    }
    onSave(form);
  }

  // Hitting Enter in the last field submits
  function onLastKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="text-sm font-medium">{form.id ? "Edit team member" : "Add team member"}</div>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Name *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Initials</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.initials}
              onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave blank to auto-derive ({deriveInitials(form.name) || "—"})
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm">Role</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              onKeyDown={onLastKeyDown}
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit}>{form.id ? "Save changes" : "Save"}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
