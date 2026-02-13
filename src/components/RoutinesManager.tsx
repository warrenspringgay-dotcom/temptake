"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { TARGET_PRESETS } from "@/lib/temp-constants";
import ActionMenu from "@/components/ActionMenu";
import RoutineRunModal from "@/components/RoutineRunModal";

const LS_LAST_INITIALS = "tt_last_initials";

type RoutineItem = {
  id?: string;
  routine_id?: string;
  position: number;
  location: string | null;
  item: string | null;
  target_key: string;
};

type RoutineRow = {
  id: string | null; // null = not yet saved
  name: string;
  active: boolean | null;
  items: RoutineItem[];
  last_used_at?: string | null;
};

function cls(...p: Array<string | false | undefined | null>) {
  return p.filter(Boolean).join(" ");
}

/** Render modals at document.body level so they aren't clipped by parent cards */
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200/60"
      : tone === "amber"
      ? "bg-amber-100 text-amber-800 border-amber-200/60"
      : "bg-slate-100 text-slate-700 border-slate-200/60";

  return (
    <span
      className={cls(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        toneCls
      )}
    >
      {children}
    </span>
  );
}

export default function RoutineManager() {
  const [rows, setRows] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [q, setQ] = useState(""); // search
  const [newName, setNewName] = useState(""); // quick add name

  // view + edit modals
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<RoutineRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineRow | null>(null);

  // run modal
  const [runRoutine, setRunRoutine] = useState<RoutineRow | null>(null);
  const [runDefaultInitials, setRunDefaultInitials] = useState<string>("");

  // permissions
  const [canManage, setCanManage] = useState(false);

  // ================= Fetch routines =================
  async function refresh() {
    setLoading(true);
    try {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) {
        setRows([]);
        return;
      }

      const { data: routines, error: rErr } = await supabase
        .from("temp_routines")
        .select("id,name,active,last_used_at")
        .eq("org_id", id)
        .order("name");

      if (rErr) throw rErr;

      if (!routines?.length) {
        setRows([]);
        return;
      }

      const ids = routines.map((r: any) => r.id);

      const { data: items, error: iErr } = await supabase
        .from("temp_routine_items")
        .select("id,routine_id,position,location,item,target_key")
        .in("routine_id", ids);

      if (iErr) throw iErr;

      const grouped = new Map<string, RoutineItem[]>();
      (items ?? []).forEach((it: any) => {
        const arr = grouped.get(it.routine_id) ?? [];
        arr.push({
          id: it.id,
          routine_id: it.routine_id,
          position: Number(it.position ?? 0),
          location: it.location ?? null,
          item: it.item ?? null,
          target_key: it.target_key ?? "chill",
        });
        grouped.set(it.routine_id, arr);
      });

      setRows(
        (routines as any[]).map((r) => ({
          id: r.id,
          name: r.name,
          active: r.active ?? true,
          last_used_at: r.last_used_at ?? null,
          items: (grouped.get(r.id) ?? []).sort((a, b) => a.position - b.position),
        }))
      );
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // ================= Permissions =================
  useEffect(() => {
    (async () => {
      try {
        const [id, userRes] = await Promise.all([getActiveOrgIdClient(), supabase.auth.getUser()]);
        const email = userRes.data.user?.email?.toLowerCase() ?? null;
        if (!id || !email) {
          setCanManage(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", id)
          .eq("email", email)
          .maybeSingle();

        if (error) {
          setCanManage(false);
          return;
        }

        const role = (data?.role ?? "").toLowerCase();
        setCanManage(role === "owner" || role === "manager" || role === "admin");
      } catch {
        setCanManage(false);
      }
    })();
  }, []);

  // ================= Default initials for run modal =================
  useEffect(() => {
    try {
      const ini = (localStorage.getItem(LS_LAST_INITIALS) ?? "").toUpperCase().trim();
      setRunDefaultInitials(ini);
    } catch {
      setRunDefaultInitials("");
    }
  }, []);

  // ================= Filter =================
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, q]);

  // ================= KPIs =================
  const totalCount = rows.length;
  const activeCount = useMemo(() => rows.filter((r) => !!(r.active ?? true)).length, [rows]);

  // ================= Actions =================
  function addQuick() {
    if (!canManage) {
      alert("Only managers/owners can create routines.");
      return;
    }

    const baseName = newName.trim() || "New routine";

    setEditing({
      id: null, // null = new routine (we'll INSERT on save)
      name: baseName,
      active: true,
      items: [],
      last_used_at: null,
    });
    setEditOpen(true);
    setNewName("");
  }

  function openView(r: RoutineRow) {
    setViewing(r);
    setViewOpen(true);
  }

  function openEdit(r: RoutineRow) {
    if (!canManage) {
      alert("Only managers / owners can edit routines.");
      return;
    }
    // Deep clone so edits don’t mutate the table list until saved
    setEditing(JSON.parse(JSON.stringify(r)));
    setEditOpen(true);
  }

  function openRun(r: RoutineRow) {
    if (!r.id) return; // only saved routines can be run
    setRunRoutine(r);
  }

  async function saveEdit() {
    if (!editing) return;
    if (!canManage) {
      alert("Only managers / owners can save routines.");
      return;
    }

    try {
      let currentOrgId = orgId;
      if (!currentOrgId) {
        currentOrgId = await getActiveOrgIdClient();
        setOrgId(currentOrgId);
      }
      if (!currentOrgId) {
        throw new Error("No organisation found.");
      }

      let routineId = editing.id;

      if (!routineId) {
        // NEW routine → INSERT into temp_routines first
        const { data, error } = await supabase
          .from("temp_routines")
          .insert({
            org_id: currentOrgId,
            name: editing.name,
            active: editing.active ?? true,
          })
          .select("id")
          .single();

        if (error) throw error;
        routineId = data.id as string;
      } else {
        // Existing routine → UPDATE
        const { error: uErr } = await supabase
          .from("temp_routines")
          .update({
            name: editing.name,
            active: editing.active ?? true,
          })
          .eq("id", routineId);

        if (uErr) throw uErr;

        // Clear old items before re-inserting
        await supabase.from("temp_routine_items").delete().eq("routine_id", routineId);
      }

      // Insert items for both new + existing routines
      const inserts = editing.items.map((it, i) => ({
        routine_id: routineId,
        position: it.position ?? i + 1,
        location: it.location ?? null,
        item: it.item ?? null,
        target_key: it.target_key,
      }));

      if (inserts.length) {
        const { error: iErr } = await supabase.from("temp_routine_items").insert(inserts);
        if (iErr) throw iErr;
      }

      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Save failed.");
    }
  }

  async function removeRoutine(id: string | null) {
    if (!canManage) {
      alert("Only managers / owners can delete routines.");
      return;
    }
    if (!id) return;
    if (!confirm("Delete routine?")) return;
    const { error } = await supabase.from("temp_routines").delete().eq("id", id);
    if (error) return alert(error.message);
    await refresh();
  }

  // ================= Render =================
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 text-slate-900 shadow-xl backdrop-blur-sm sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Temperature routines
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold text-slate-900">Routines</h1>

          <div className="mt-2 flex max-w-full flex-wrap items-center gap-2 overflow-hidden">
            <Pill>{totalCount} total</Pill>
            <Pill tone="emerald">{activeCount} active</Pill>
            {!canManage ? <Pill tone="amber">View-only</Pill> : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[280px]">
            <input
              className="h-10 w-full rounded-2xl border border-slate-300 bg-white/80 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Search routines…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
          </div>

          <button
            type="button"
            className={cls(
              "h-10 rounded-2xl px-4 text-sm font-medium text-white shadow-sm transition",
              canManage ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-400"
            )}
            onClick={() => {
              setEditing({
                id: null,
                name: "New routine",
                active: true,
                items: [],
                last_used_at: null,
              });
              setEditOpen(true);
            }}
            disabled={loading || !canManage}
            title={canManage ? "Create routine" : "Ask a manager to create routines"}
          >
            + New
          </button>
        </div>
      </div>

      {/* Quick add */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <input
            className="h-10 rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
            placeholder={canManage ? "Quick add routine name…" : "View-only · ask manager to add"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={!canManage}
            onKeyDown={(e) => {
              if (e.key === "Enter") addQuick();
            }}
          />

          <button
            type="button"
            className={cls(
              "h-10 rounded-2xl px-4 text-sm font-medium text-white shadow-sm transition",
              canManage ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-400"
            )}
            onClick={addQuick}
            disabled={loading || !canManage}
          >
            Add routine
          </button>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          Tip: Tap a routine to view steps. Use “Use routine” to run it.
        </div>
      </div>

      {/* List - mobile cards */}
      <div className="space-y-2 sm:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : filtered.length ? (
          filtered.map((r) => {
            const isActive = !!(r.active ?? true);
            return (
              <div
                key={r.id ?? `temp-${r.name}`}
                className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => r.id && openView(r)}
                    disabled={!r.id}
                    title={r.id ? "Open routine" : "Not saved yet"}
                  >
                    <div className="truncate text-sm font-semibold text-slate-900">{r.name}</div>
                    <div className="mt-1 flex max-w-full flex-wrap items-center gap-2 overflow-hidden">
                      <Pill tone={isActive ? "emerald" : "amber"}>{isActive ? "Active" : "Inactive"}</Pill>
                      <Pill>{r.items.length} steps</Pill>
                    </div>
                  </button>

                  <ActionMenu
                    items={[
                      ...(r.id
                        ? [
                            { label: "View", onClick: () => openView(r) },
                            { label: "Use routine", onClick: () => openRun(r) },
                          ]
                        : []),
                      ...(canManage ? [{ label: "Edit", onClick: () => openEdit(r) }] : []),
                      ...(canManage && r.id
                        ? [{ label: "Delete", onClick: () => removeRoutine(r.id), variant: "danger" as const }]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center text-sm text-slate-500">
            No routines yet.
          </div>
        )}
      </div>

      {/* List - desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm sm:block">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[60%]" />
            <col className="w-[14%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead className="bg-slate-50/80">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Steps</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => {
                const isActive = !!(r.active ?? true);
                return (
                  <tr key={r.id ?? `temp-${r.name}`} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {r.id ? (
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:text-emerald-700"
                          title="Open"
                          onClick={() => openView(r)}
                        >
                          {r.name}
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-900">{r.name}</span>
                      )}
                      <div className="mt-1">
                        <Pill tone={isActive ? "emerald" : "amber"}>{isActive ? "Active" : "Inactive"}</Pill>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-900">{r.items.length}</td>

                    <td className="px-4 py-3">
                      <ActionMenu
                        items={[
                          ...(r.id
                            ? [
                                { label: "View", onClick: () => openView(r) },
                                { label: "Use routine", onClick: () => openRun(r) },
                              ]
                            : []),
                          ...(canManage ? [{ label: "Edit", onClick: () => openEdit(r) }] : []),
                          ...(canManage && r.id
                            ? [{ label: "Delete", onClick: () => removeRoutine(r.id), variant: "danger" as const }]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No routines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== View Card ===== */}
      {viewOpen && viewing && viewing.id && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setViewOpen(false)}>
            <div
              className="mx-auto mt-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 text-slate-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 rounded-t-3xl bg-slate-900 px-4 py-3 text-white">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">Routine</div>
                  <div className="truncate text-xl font-semibold">{viewing.name}</div>

                  <div className="mt-1 flex max-w-full flex-wrap gap-2 overflow-hidden">
                    <Pill tone={viewing.active ? "emerald" : "amber"}>{viewing.active ? "Active" : "Inactive"}</Pill>
                    <Pill>{viewing.items.length} steps</Pill>
                  </div>
                </div>

                <button
                  className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
                  onClick={() => setViewOpen(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4">
                {viewing.items.length ? (
                  <ul className="space-y-2">
                    {viewing.items.map((it) => (
                      <li
                        key={`${it.position}-${it.item}-${it.location}`}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Step {it.position}</div>
                          <Pill>{it.target_key}</Pill>
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {[it.location, it.item].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-600">No items in this routine.</div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 p-3">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  onClick={() => {
                    setViewOpen(false);
                    openRun(viewing);
                  }}
                >
                  Use routine
                </button>

                <button
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setViewOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===== Edit Modal ===== */}
      {editOpen && editing && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          >
            <div
              className="mx-auto mt-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold">{editing.id ? "Edit routine" : "New routine"}</div>
                <button
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    className="h-10 w-full rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      className="accent-emerald-600"
                      checked={!!editing.active}
                      onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-4">
                {/* CHANGED: removed header-level Add step button */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Steps</div>
                </div>

                <div className="space-y-2">
                  {editing.items.map((it, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                      <div className="grid gap-2 sm:grid-cols-[88px_1fr_1fr_1fr_auto]">
                        <input
                          className="h-10 rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm"
                          placeholder="#"
                          type="number"
                          value={it.position}
                          onChange={(e) => {
                            const copy: RoutineRow = { ...editing, items: [...editing.items] };
                            copy.items[i] = { ...copy.items[i], position: Number(e.target.value) || 0 };
                            setEditing(copy);
                          }}
                        />
                        <input
                          className="h-10 rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm"
                          placeholder="Location"
                          value={it.location ?? ""}
                          onChange={(e) => {
                            const copy: RoutineRow = { ...editing, items: [...editing.items] };
                            copy.items[i] = { ...copy.items[i], location: e.target.value || null };
                            setEditing(copy);
                          }}
                        />
                        <input
                          className="h-10 rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm"
                          placeholder="Item"
                          value={it.item ?? ""}
                          onChange={(e) => {
                            const copy: RoutineRow = { ...editing, items: [...editing.items] };
                            copy.items[i] = { ...copy.items[i], item: e.target.value || null };
                            setEditing(copy);
                          }}
                        />
                        <select
                          className="h-10 rounded-2xl border border-slate-300 bg-white/80 px-3 text-sm"
                          value={it.target_key}
                          onChange={(e) => {
                            const copy: RoutineRow = { ...editing, items: [...editing.items] };
                            copy.items[i] = { ...copy.items[i], target_key: e.target.value };
                            setEditing(copy);
                          }}
                        >
                          {TARGET_PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              items: editing.items.filter((_, idx) => idx !== i),
                            })
                          }
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {!editing.items.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
                      No steps yet. Add one.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* CHANGED: Add step moved to footer near Save/Cancel */}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      items: [
                        ...editing.items,
                        {
                          position: (editing.items.at(-1)?.position ?? 0) + 1,
                          location: "",
                          item: "",
                          target_key: "chill",
                        },
                      ],
                    })
                  }
                  type="button"
                >
                  + Add step
                </button>

                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  onClick={saveEdit}
                  disabled={!canManage}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===== Run modal ===== */}
      <RoutineRunModal
        open={!!runRoutine}
        routine={
          runRoutine && runRoutine.id
            ? ({
                id: runRoutine.id,
                name: runRoutine.name,
                active: !!(runRoutine.active ?? true),
                items: (runRoutine.items ?? []).map((it) => ({
                  id: String(it.id ?? `${runRoutine.id}:${it.position}`),
                  routine_id: String(runRoutine.id),
                  position: Number(it.position ?? 0),
                  location: it.location ?? null,
                  item: it.item ?? null,
                  target_key: String(it.target_key ?? "chill"),
                })),
              } as any)
            : null
        }
        defaultDate={todayISO()}
        defaultInitials={runDefaultInitials}
        onClose={() => setRunRoutine(null)}
        onSaved={async () => {
          await refresh();
          setRunRoutine(null);
        }}
      />
    </div>
  );
}
