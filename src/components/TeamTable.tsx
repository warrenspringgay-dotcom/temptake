// src/components/TeamTable.tsx
"use client";

import React from "react";
import {
  listTeamMembers,
  upsertTeamMember,
  deleteTeamMember,
} from "@/app/actions/team";

type Member = {
  id: string;
  name: string;
  initials: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean | null;
  status?: string; // "OK" | "Inactive"
};

type FormState = {
  id?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;
};

export default function TeamTable() {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>({
    id: undefined,
    name: "",
    role: "",
    email: "",
    phone: "",
    notes: "",
    active: true,
  });

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rows = await listTeamMembers();
        setMembers(
          rows.map((r: any) => ({
            id: r.id,
            name: r.name ?? "",
            initials: r.initials ?? "",
            role: r.role ?? "",
            email: r.email ?? "",
            phone: r.phone ?? "",
            notes: r.notes ?? "",
            active: typeof r.active === "boolean" ? r.active : true,
            status: r.status ?? (r.active ? "OK" : "Inactive"),
          }))
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load team");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      id: undefined,
      name: "",
      role: "",
      email: "",
      phone: "",
      notes: "",
      active: true,
    });
    // Scroll to editor
    if (typeof window !== "undefined") {
      document.getElementById("team-editor")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function startEdit(m: Member) {
    setEditingId(m.id);
    setForm({
      id: m.id,
      name: m.name ?? "",
      role: m.role ?? "",
      email: m.email ?? "",
      phone: m.phone ?? "",
      notes: m.notes ?? "",
      active: m.active ?? true,
    });
    if (typeof window !== "undefined") {
      document.getElementById("team-editor")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({
      id: undefined,
      name: "",
      role: "",
      email: "",
      phone: "",
      notes: "",
      active: true,
    });
  }

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const saved = await upsertTeamMember({
        id: form.id,
        display_name: form.name.trim(), // send both display_name & name; action is schema-safe
        name: form.name.trim(),
        role: form.role.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        active: !!form.active,
      });

      setMembers((prev) => {
        const i = prev.findIndex((p) => p.id === saved.id);
        const normalized: Member = {
          id: saved.id,
          name: saved.name ?? "",
          initials: saved.initials ?? "",
          role: saved.role ?? "",
          email: saved.email ?? "",
          phone: saved.phone ?? "",
          notes: saved.notes ?? "",
          active: typeof saved.active === "boolean" ? saved.active : true,
          status: saved.status ?? (saved.active ? "OK" : "Inactive"),
        };
        if (i >= 0) {
          const next = prev.slice();
          next[i] = normalized;
          return next;
        }
        return [normalized, ...prev];
      });

      cancelEdit();
    } catch (e: any) {
      setError(e?.message || "Failed to save member");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this team member?")) return;
    try {
      await deleteTeamMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e: any) {
      setError(e?.message || "Failed to delete member");
    }
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      return (
        m.name.toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  return (
    <>
      {/* Section header row with "+ Add" like the screenshot */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="text-sm font-medium">Team</div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-56 rounded-md border px-3 py-1.5 text-sm"
          />
          <button
            onClick={startCreate}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No team members.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <Th>Initials</Th>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Notes</Th>
                <Th>Active</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t">
                  <Td className="font-semibold">{m.initials || "—"}</Td>
                  <Td>{m.name || "—"}</Td>
                  <Td>{m.role || "—"}</Td>
                  <Td>
                    <div>{m.email || "—"}</div>
                    <div className="text-gray-500">{m.phone || ""}</div>
                  </Td>
                  <Td>
                    {m.status === "OK" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        OK
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Inactive
                      </span>
                    )}
                  </Td>
                  <Td>{m.notes || "—"}</Td>
                  <Td>{m.active ? "Active" : "No"}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <button
                      onClick={() => alert("Training modal coming soon")}
                      className="mr-2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      + Training
                    </button>
                    <button
                      onClick={() => startEdit(m)}
                      className="mr-2 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Training by member block (like the screenshot). This is a placeholder list
          using the currently selected/only member; adapt to your training schema later. */}
      <div className="mt-6 border-t px-4 py-4">
        {members.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Training by member
            </div>
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div>
                  {members[0].name}{" "}
                  {members[0].initials ? (
                    <span className="text-gray-500">({members[0].initials})</span>
                  ) : null}
                </div>
                <button
                  onClick={() => alert("Training add coming soon")}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  + Add training
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <Th>Type</Th>
                      <Th>Awarded</Th>
                      <Th>Expires</Th>
                      <Th>Status</Th>
                      <Th>Certificate</Th>
                      <Th>Notes</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <Td colSpan={7} className="text-gray-500">
                        No trainings recorded.
                      </Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Editor panel */}
      <div id="team-editor" className="border-t p-4">
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-6"
        >
          <Field label="Name" className="sm:col-span-2" required>
            <input
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Warren Springgay"
              required
            />
          </Field>

          <Field label="Role" className="sm:col-span-2">
            <input
              value={form.role}
              onChange={(e) => onChange("role", e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Chef / Manager"
            />
          </Field>

          <Field label="Email" className="sm:col-span-2">
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="name@company.com"
            />
          </Field>

          <Field label="Phone" className="sm:col-span-2">
            <input
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="+44…"
            />
          </Field>

          <Field label="Notes" className="sm:col-span-3">
            <input
              value={form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="Allergens, schedule, etc."
            />
          </Field>

          <Field label="Active" className="sm:col-span-1">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => onChange("active", e.target.checked)}
              className="h-4 w-4"
            />
          </Field>

          <div className="sm:col-span-6 mt-2 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {editingId ? "Save changes" : "Add member"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </>
  );
}

/* ------------------------- small UI helpers ------------------------- */

function Field({
  label,
  children,
  className,
  required,
}: React.PropsWithChildren<{ label: string; className?: string; required?: boolean }>) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Th({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return <th className={`px-3 py-2 text-left ${className ?? ""}`}>{children}</th>;
}

function Td({
  children,
  className,
  colSpan,
}: React.PropsWithChildren<{ className?: string; colSpan?: number }>) {
  return <td colSpan={colSpan} className={`px-3 py-2 align-top ${className ?? ""}`}>{children}</td>;
}
