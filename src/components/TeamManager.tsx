"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ActionMenu from "@/components/ActionMenu";
import { saveTrainingServer } from "@/app/actions/training";
import { inviteTeamMemberServer } from "@/app/actions/team"; // NEW

/* -------------------- Types -------------------- */
type Member = {
  id: string;
  initials: string | null;
  name: string;
  email: string | null;
  role: string | null;
  phone: string | null;
  active: boolean | null;
  notes?: string | null;
};

type Training = {
  id: string;
  staff_id: string;
  type: string | null;
  certificate_url: string | null;
  awarded_on: string | null; // yyyy-mm-dd
  expires_on: string | null; // yyyy-mm-dd
  notes: string | null;
};

/* -------------------- Helpers -------------------- */
function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function safeInitials(m: Member): string {
  const fromField = (m.initials ?? "").trim().toUpperCase();
  if (fromField) return fromField;

  const parts = m.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
}

/* ================================================= */
export default function TeamManager() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [q, setQ] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Member | null>(null);

  const [eduOpen, setEduOpen] = useState(false);
  const [eduFor, setEduFor] = useState<Member | null>(null);
  const [eduSaving, setEduSaving] = useState(false);
  const [eduForm, setEduForm] = useState({
    course: "",
    provider: "",
    certificateUrl: "",
    completedOn: "",
    expiryOn: "",
    notes: "",
  });

  const [eduList, setEduList] = useState<Training[]>([]);
  const [eduListLoading, setEduListLoading] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "staff",
  });
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  // Highlight for deep-linked member (from ?staff=)
  const [highlightId, setHighlightId] = useState<string | null>(null);

  /* -------------------- Load team + determine owner -------------------- */
  async function load() {
    setLoading(true);
    setIsOwner(false);

    try {
      const [id, userRes] = await Promise.all([
        getActiveOrgIdClient(),
        supabase.auth.getUser(),
      ]);

      const userEmail = userRes.data.user?.email?.toLowerCase() ?? null;
      const userName =
        (userRes.data.user?.user_metadata as any)?.full_name ??
        userRes.data.user?.email ??
        "Owner";

      setOrgId(id ?? null);

      if (!id) {
        setRows([]);
        setLoading(false);
        return;
      }

      let members: Member[] = [];
      let ownerFlag = false;

      const { data, error } = await supabase
        .from("team_members")
        .select("id, initials, name, email, role, phone, active, notes")
        .eq("org_id", id)
        .order("name", { ascending: true });

      if (error) throw error;
      members = (data ?? []) as Member[];

      if (members.length === 0 && id && userEmail) {
        const { data: inserted, error: insErr } = await supabase
          .from("team_members")
          .insert({
            org_id: id,
            initials: null,
            name: userName,
            email: userEmail,
            role: "owner",
            phone: null,
            notes: null,
            active: true,
          })
          .select("id, initials, name, email, role, phone, active, notes")
          .maybeSingle();

        if (!insErr && inserted) {
          members = [inserted as Member];
          ownerFlag = true;
        }
      }

      if (!ownerFlag && userEmail && members.length) {
        const me = members.find(
          (m) => m.email && m.email.toLowerCase() === userEmail
        );
        const role = (me?.role ?? "").toLowerCase();
        ownerFlag = role === "owner" || role === "admin";
      }

      setRows(members);
      setIsOwner(ownerFlag);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load team.");
      setRows([]);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* -------------------- Deep-link handling (?staff=...) -------------------- */
  useEffect(() => {
    const staffParam = searchParams.get("staff");
    if (!staffParam || !rows.length) return;

    const needle = staffParam.trim().toUpperCase();

    // Try match by team member id first
    let match =
      rows.find((m) => m.id === staffParam) ??
      rows.find((m) => safeInitials(m).toUpperCase() === needle);

    if (!match) return;

    setViewFor(match);
    setViewOpen(true);
    setHighlightId(match.id);

    // Clean the URL so future refreshes don't keep reopening
    router.replace("/team");
  }, [searchParams, rows, router]);

  // Auto fade highlight after a few seconds
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 8000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  /* -------------------- Filtering -------------------- */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.initials, r.name, r.email, r.role]
        .filter(Boolean)
        .some((s) => (s ?? "").toLowerCase().includes(term))
    );
  }, [rows, q]);

  /* -------------------- Member CRUD -------------------- */
  function openAdd() {
    setEditing({
      id: "",
      initials: "",
      name: "",
      email: "",
      role: "staff",
      phone: "",
      active: true,
      notes: "",
    });
    setEditOpen(true);
  }

  function openEdit(m: Member) {
    setEditing({ ...m });
    setEditOpen(true);
  }

  async function saveMember() {
    if (!editing) return;
    try {
      if (!orgId) return alert("No organisation found.");
      if (!editing.name.trim()) return alert("Name is required.");

      const roleValue = (editing.role ?? "").trim().toLowerCase() || "staff";

      if (editing.id) {
        const updatePayload: any = {
          initials: editing.initials?.trim() || null,
          name: editing.name.trim(),
          email: editing.email?.trim() || null,
          phone: editing.phone?.trim() || null,
          notes: editing.notes?.trim() || null,
          active: editing.active ?? true,
        };

        if (isOwner) {
          updatePayload.role = roleValue;
        }

        const { error } = await supabase
          .from("team_members")
          .update(updatePayload)
          .eq("id", editing.id)
          .eq("org_id", orgId);
        if (error) throw error;
      } else {
        if (!isOwner) {
          alert("Only the owner can add team members.");
          return;
        }

        const { error } = await supabase.from("team_members").insert({
          org_id: orgId,
          initials: editing.initials?.trim() || null,
          name: editing.name.trim(),
          email: editing.email?.trim() || null,
          role: roleValue,
          phone: editing.phone?.trim() || null,
          notes: editing.notes?.trim() || null,
          active: true,
        });
        if (error) throw error;
      }

      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Save failed.");
    }
  }

  async function remove(id: string) {
    if (!isOwner) {
      alert("Only the owner can delete team members.");
      return;
    }
    if (!confirm("Delete this team member?")) return;
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed.");
    }
  }

  /* -------------------- Training load / save -------------------- */

  // Load trainings for a given member by resolving staff.id from the staff table
  async function loadTrainingsFor(member: Member) {
    setEduListLoading(true);
    try {
      const initials = safeInitials(member);
      if (!initials) {
        setEduList([]);
        return;
      }

      const { data: staffRow, error: staffErr } = await supabase
        .from("staff")
        .select("id")
        .eq("initials", initials)
        .maybeSingle();

      if (staffErr || !staffRow?.id) {
        setEduList([]);
        return;
      }

      const staffId = staffRow.id as string;

      const { data, error } = await supabase
        .from("trainings")
        .select(
          "id, staff_id, type, certificate_url, awarded_on, expires_on, notes"
        )
        .eq("staff_id", staffId)
        .order("awarded_on", { ascending: false });

      if (error) throw error;
      setEduList((data ?? []) as Training[]);
    } catch {
      setEduList([]);
    } finally {
      setEduListLoading(false);
    }
  }

  function openCard(m: Member) {
    setViewFor(m);
    setViewOpen(true);
    void loadTrainingsFor(m);
  }

  function openEducation(m: Member) {
    setEduFor(m);
    setEduForm({
      course: "",
      provider: "",
      certificateUrl: "",
      completedOn: "",
      expiryOn: "",
      notes: "",
    });
    setEduOpen(true);
  }

  async function saveEducation() {
    if (!eduFor) return;
    if (!eduForm.course.trim()) return;

    try {
      setEduSaving(true);

      const initials = safeInitials(eduFor);
      if (!initials) {
        alert("This team member has no initials set.");
        return;
      }

      const combinedNotes =
        [
          eduForm.provider && `Provider: ${eduForm.provider}`,
          eduForm.notes && eduForm.notes,
        ]
          .filter(Boolean)
          .join(" · ") || null;

      const todayISO = new Date().toISOString().slice(0, 10);
      const awarded_on = eduForm.completedOn || todayISO;

      await saveTrainingServer({
        type: eduForm.course.trim(),
        awarded_on,
        expires_on: eduForm.expiryOn || null,
        certificate_url: eduForm.certificateUrl.trim() || null,
        notes: combinedNotes,
        staffInitials: initials,
      });

      await loadTrainingsFor(eduFor);
      setEduOpen(false);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save training.");
    } finally {
      setEduSaving(false);
    }
  }

  /* -------------------- Invite flow (admin invite link) -------------------- */
  function openInvite() {
    setInviteForm({ email: "", role: "staff" });
    setInviteError(null);
    setInviteInfo(null);
    setInviteOpen(true);
  }

  async function sendInvite() {
    setInviteError(null);
    setInviteInfo(null);

    const cleanEmail = inviteForm.email.trim().toLowerCase();
    const role = (inviteForm.role.trim() || "staff").toLowerCase();

    if (!cleanEmail) {
      setInviteError("Enter an email to invite.");
      return;
    }

    try {
      setInviteSending(true);

      const res = await inviteTeamMemberServer({
        email: cleanEmail,
        role,
      });

      if (!res.ok) {
        setInviteError(res.message ?? "Failed to send invite.");
      } else {
        setInviteInfo(
          "Invite sent. They’ll get an email to set their password and log in."
        );
        await load();
      }
    } catch (e: any) {
      setInviteError(e?.message ?? "Failed to send invite.");
    } finally {
      setInviteSending(false);
    }
  }


  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Team</h1>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 md:w-64"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {isOwner && (
            <>
              <button
                onClick={openInvite}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Invite by email
              </button>
              <button
                onClick={openAdd}
                className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                + Add member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-slate-500">
              <th className="w-24 py-2 pr-3">Initials</th>
              <th className="py-2 pr-3">Name</th>
              <th className="w-56 py-2 pr-3">Role</th>
              <th className="w-20 py-2 pr-3">Active</th>
              <th className="w-40 py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-slate-100 transition ${
                    highlightId === r.id
                      ? "bg-emerald-50/80 ring-1 ring-emerald-300/60 animate-pulse"
                      : ""
                  }`}
                >
                  <td className="py-2 pr-3 text-center font-medium text-slate-900">
                    {r.initials ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      className="text-emerald-700 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-800"
                      onClick={() => openCard(r)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-slate-900">
                    {r.role
                      ? r.role.charAt(0).toUpperCase() +
                        r.role.slice(1).toLowerCase()
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-slate-900">
                    {r.active ? "Yes" : "No"}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "View card",
                          onClick: () => openCard(r),
                        },
                        {
                          label: "Edit",
                          onClick: () => openEdit(r),
                        },
                        {
                          label: "Add education",
                          onClick: () => openEducation(r),
                        },
                        ...(isOwner
                          ? [
                              {
                                label: "Delete",
                                onClick: () => remove(r.id),
                                variant: "danger" as const,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-center text-slate-500 backdrop-blur-sm">
            Loading…
          </div>
        ) : filtered.length ? (
          filtered.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-900 backdrop-blur-sm transition ${
                highlightId === r.id
                  ? "bg-emerald-50/80 ring-1 ring-emerald-300/60 animate-pulse"
                  : ""
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <button
                    className="font-medium text-emerald-700 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-800"
                    onClick={() => openCard(r)}
                  >
                    {r.name}
                  </button>
                  <div className="text-xs text-slate-500">
                    {r.role
                      ? r.role.charAt(0).toUpperCase() +
                        r.role.slice(1).toLowerCase()
                      : "—"}{" "}
                    · {r.active ? "Active" : "Inactive"}
                  </div>
                </div>
                <ActionMenu
                  items={[
                    {
                      label: "View card",
                      onClick: () => openCard(r),
                    },
                    {
                      label: "Edit",
                      onClick: () => openEdit(r),
                    },
                    {
                      label: "Add education",
                      onClick: () => openEducation(r),
                    },
                    ...(isOwner
                      ? [
                          {
                            label: "Delete",
                            onClick: () => remove(r.id),
                            variant: "danger" as const,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                <div>
                  <span className="text-slate-500">Initials:</span>{" "}
                  {r.initials ?? "—"}
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>{" "}
                  {r.phone ?? "—"}
                </div>
                <div className="col-span-2 truncate">
                  <span className="text-slate-500">Email:</span>{" "}
                  {r.email ?? "—"}
                </div>
                {r.notes ? (
                  <div className="col-span-2 text-slate-600">
                    {r.notes}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-center text-slate-500 backdrop-blur-sm">
            No team members yet.
          </div>
        )}
      </div>

      {/* Edit / Add modal */}
      {editOpen && editing && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">
                {editing.id ? "Edit member" : "Add member"}
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Initials
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={editing.initials ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        initials: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">
                    Name *
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Email
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={editing.email ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Phone
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={editing.phone ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Role
                  </label>
                  {isOwner ? (
                    <select
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
                      value={(editing.role ?? "staff").toLowerCase()}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : (
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                      value={
                        (editing.role ?? "staff")
                          .toString()
                          .charAt(0)
                          .toUpperCase() +
                        (editing.role ?? "staff")
                          .toString()
                          .slice(1)
                          .toLowerCase()
                      }
                      disabled
                    />
                  )}
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={!!editing.active}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        active: e.target.checked,
                      })
                    }
                  />
                  Active
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Notes
                </label>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  value={editing.notes ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  onClick={saveMember}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business card modal */}
      {viewOpen && viewFor && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setViewOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white/90 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 px-4 py-3 text-white">
              <div className="text-sm opacity-80">Team member</div>
              <div className="text-xl font-semibold">{viewFor.name}</div>
              <div className="opacity-80">
                {viewFor.active ? "Active" : "Inactive"}
              </div>
            </div>

            <div className="space-y-2 p-4 text-sm">
              <div>
                <span className="font-medium">Initials:</span>{" "}
                {viewFor.initials ?? "—"}
              </div>
              <div>
                <span className="font-medium">Role:</span>{" "}
                {viewFor.role
                  ? viewFor.role.charAt(0).toUpperCase() +
                    viewFor.role.slice(1).toLowerCase()
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Email:</span>{" "}
                {viewFor.email ?? "—"}
              </div>
              <div>
                <span className="font-medium">Phone:</span>{" "}
                {viewFor.phone ?? "—"}
              </div>
              <div>
                <span className="font-medium">Notes:</span>{" "}
                {viewFor.notes ?? "—"}
              </div>

              <div className="mt-3">
                <div className="mb-1 font-medium">Education</div>
                {eduListLoading ? (
                  <div className="text-slate-500">Loading…</div>
                ) : eduList.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {eduList.map((t) => (
                      <li key={t.id}>
                        <span className="font-medium">
                          {t.type ?? "Course"}
                        </span>{" "}
                        {t.certificate_url && (
                          <a
                            className="text-emerald-700 underline"
                            href={t.certificate_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            (certificate)
                          </a>
                        )}
                        <div className="text-xs text-slate-600">
                          Awarded: {fmt(t.awarded_on)} · Expires:{" "}
                          {fmt(t.expires_on)}
                          {t.notes ? ` · ${t.notes}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-500">
                    No education records.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 p-3">
              <button
                onClick={() => {
                  setViewOpen(false);
                  openEducation(viewFor);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Add education
              </button>
              <button
                onClick={() => setViewOpen(false)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Education modal */}
      {eduOpen && eduFor && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setEduOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">
                Education · {eduFor.name}
              </div>
              <button
                onClick={() => setEduOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 text-sm">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Course / Type *
                </label>
                <input
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  value={eduForm.course}
                  onChange={(e) =>
                    setEduForm((f) => ({
                      ...f,
                      course: e.target.value,
                    }))
                  }
                  placeholder="e.g., Food Hygiene L2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Provider
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={eduForm.provider}
                    onChange={(e) =>
                      setEduForm((f) => ({
                        ...f,
                        provider: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Certificate URL / ID
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={eduForm.certificateUrl}
                    onChange={(e) =>
                      setEduForm((f) => ({
                        ...f,
                        certificateUrl: e.target.value,
                      }))
                    }
                    placeholder="Link or reference"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Completed on
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={eduForm.completedOn}
                    onChange={(e) =>
                      setEduForm((f) => ({
                        ...f,
                        completedOn: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                    value={eduForm.expiryOn}
                    onChange={(e) =>
                      setEduForm((f) => ({
                        ...f,
                        expiryOn: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Notes
                </label>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2"
                  value={eduForm.notes}
                  onChange={(e) =>
                    setEduForm((f) => ({
                      ...f,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Any extra info…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setEduOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={eduSaving || !eduForm.course.trim()}
                  onClick={saveEducation}
                >
                  {eduSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-lg backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">
                Invite team member
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  placeholder="team@example.com"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((f) => ({
                      ...f,
                      email: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Role
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((f) => ({
                      ...f,
                      role: e.target.value,
                    }))
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <p className="text-xs text-slate-500">
                We’ll add them to this business and send a sign-in link. If they
                already have an account, they can just sign in with this email.
              </p>

              {inviteError && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {inviteError}
                </div>
              )}
              {inviteInfo && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {inviteInfo}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={inviteSending}
                  onClick={sendInvite}
                >
                  {inviteSending ? "Sending…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
