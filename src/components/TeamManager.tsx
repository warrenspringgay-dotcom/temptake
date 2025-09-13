"use client";

import { useEffect, useMemo, useState } from "react";

// ---- Minimal types to match your /api/team shape
type TeamMember = {
  id?: string;
  name?: string;        // full name (you said no first/last split)
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: string;      // e.g., "OK" (optional)
  active?: boolean;
  initials?: string;    // optional column; we’ll derive if missing
};

// --- Helpers
function deriveInitials(name?: string) {
  if (!name?.trim()) return "—";
  // Get first letter of first two words
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b || a).toUpperCase();
}

// Safe fetchers that never throw to keep the UI snappy
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
    await fetch("/api/team", { method: "POST", body: JSON.stringify(payload) });
  } catch {}
}
async function deleteTeamSafe(id: string) {
  try {
    await fetch(`/api/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {}
}

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

  // Load table
  useEffect(() => {
    (async () => {
      const list = await listTeamSafe();
      setRows(Array.isArray(list) ? list : []);
    })();
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.role, r.email, r.phone, r.notes]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);

    const payload: Partial<TeamMember> = {
      id: form.id,
      name: form.name?.trim(),
      role: form.role?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      notes: form.notes?.trim() || null,
      active: !!form.active,
      // Derive initials on the way in if you want to persist it too:
      initials: deriveInitials(form.name),
      status: form.status ?? "OK",
    };

    await upsertTeamSafe(payload);
    const next = await listTeamSafe();
    setRows(next);
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
      status: r.status ?? "OK",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeRow(id?: string) {
    if (!id) return;
    if (!confirm("Delete this team member?")) return;
    await deleteTeamSafe(id);
    const next = await listTeamSafe();
    setRows(next);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[18px] font-semibold">Team</h1>
        <div className="ml-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-8 w-[220px] rounded-lg border border-gray-200 bg-white px-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Editor – compact, light borders (matches Suppliers look) */}
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
              className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Role</label>
            <input
              value={form.role ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g., Chef / Manager"
              className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
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
              className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@company.com"
              className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-gray-500">Notes</label>
            <input
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Allergens, schedule, etc."
              className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving || !form.name?.trim()}
            className={`h-9 rounded-xl px-4 text-sm font-medium text-white ${
              saving ? "bg-gray-400" : "bg-black hover:bg-gray-900"
            }`}
          >
            {form.id ? "Update member" : "Add member"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm({ name: "", role: "", email: "", phone: "", notes: "", active: true })}
              className="h-9 rounded-xl border border-gray-200 bg-white px-4 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Table – same compact look as Suppliers */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">Initials</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Status</th>
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
                    <tr key={r.id ?? r.name} className="border-t align-middle">
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
                      <td className="py-2 pr-3 max-w-[20rem]">
                        <div className="truncate">{r.notes || "—"}</div>
                      </td>
                      <td className="py-2 pr-3">{r.active ? "Active" : "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => alert("Training modal TBD")}
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                            title="Training"
                          >
                            Training
                          </button>
                          <button
                            onClick={() => editRow(r)}
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                            title="Edit"
                            aria-label="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => r.id && removeRow(r.id)}
                            className="h-7 rounded-xl border border-gray-200 bg-white px-2 text-xs hover:bg-gray-50"
                            title="Delete"
                            aria-label="Delete"
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
                  <td colSpan={8} className="py-4 text-center text-gray-500">
                    No team members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
