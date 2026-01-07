// src/app/manager/feedback/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

const SUPERADMIN_USER_ID = "ae9dde44-35bf-4045-984f-cef2cae3359b";

type FeedbackItem = {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  area: string | null;
  location_id: string | null;
  user_id: string;
  created_at: string;
  meta: any;
  org_id: string;
};

type TeamMemberLite = {
  user_id: string | null;
  name: string | null;
  email: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTimeHHMM(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function displayUser(
  userId: string,
  tm?: TeamMemberLite | null
): { primary: string; secondary: string } {
  if (tm?.name) {
    return {
      primary: tm.name,
      secondary: tm.email ? tm.email : shortId(userId),
    };
  }
  if (tm?.email) {
    return {
      primary: tm.email,
      secondary: shortId(userId),
    };
  }
  return {
    primary: shortId(userId),
    secondary: userId,
  };
}

export default function ManagerFeedbackPage() {
  const router = useRouter();

  // ✅ Access control (client gate)
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // user_id -> team member
  const [teamByUserId, setTeamByUserId] = useState<
    Record<string, TeamMemberLite>
  >({});

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  // ✅ Hard gate: only your Supabase user id can view this page
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        const uid = data?.user?.id ?? null;

        if (!uid || uid !== SUPERADMIN_USER_ID) {
          if (!alive) return;
          setAuthorized(false);
          setAuthChecking(false);

          // Bounce them somewhere safe. You asked for /dashboard as fallback.
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        if (!alive) return;
        setAuthorized(true);
        setAuthChecking(false);
      } catch {
        if (!alive) return;
        setAuthorized(false);
        setAuthChecking(false);
        router.replace("/dashboard");
        router.refresh();
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function loadTeamMembersFor(userIds: string[], orgId: string) {
    if (!userIds.length) {
      setTeamByUserId({});
      return;
    }

    // De-dupe + keep sane size
    const unique = Array.from(new Set(userIds)).filter(Boolean).slice(0, 500);

    const { data, error } = await supabase
      .from("team_members")
      .select("user_id,name,email,initials,role,active")
      .eq("org_id", orgId)
      .in("user_id", unique);

    if (error) {
      console.warn("team_members lookup failed:", error.message);
      setTeamByUserId({});
      return;
    }

    const map: Record<string, TeamMemberLite> = {};
    (data ?? []).forEach((r: any) => {
      const uid = r.user_id ? String(r.user_id) : null;
      if (!uid) return;
      map[uid] = {
        user_id: uid,
        name: r.name ? String(r.name) : null,
        email: r.email ? String(r.email) : null,
        initials: r.initials ? String(r.initials) : null,
        role: r.role ? String(r.role) : null,
        active: typeof r.active === "boolean" ? r.active : null,
      };
    });

    setTeamByUserId(map);
  }

  async function load() {
    // Don’t even try if not authorized
    if (!authorized) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
  .from("feedback_items")
  .select("id,kind,message,page_path,area,location_id,user_id,created_at,meta,org_id")
  .order("created_at", { ascending: false })
  .limit(500);


      if (kind !== "all") query = query.eq("kind", kind);

      const { data, error: e } = await query;
      if (e) throw e;

      const list = (data ?? []) as FeedbackItem[];
      setItems(list);

      // Resolve users -> team members
     // Resolve users -> team members (grouped by org)
const byOrg = new Map<string, string[]>();

for (const row of list) {
  if (!row.org_id || !row.user_id) continue;
  const arr = byOrg.get(row.org_id) ?? [];
  arr.push(row.user_id);
  byOrg.set(row.org_id, arr);
}

// Build one combined map
const combined: Record<string, TeamMemberLite> = {};

for (const [oid, uids] of byOrg.entries()) {
  const unique = Array.from(new Set(uids)).slice(0, 500);

  const { data, error } = await supabase
    .from("team_members")
    .select("user_id,name,email,initials,role,active")
    .eq("org_id", oid)
    .in("user_id", unique);

  if (error) {
    console.warn("team_members lookup failed for org:", oid, error.message);
    continue;
  }

  (data ?? []).forEach((r: any) => {
    const uid = r.user_id ? String(r.user_id) : null;
    if (!uid) return;
    combined[uid] = {
      user_id: uid,
      name: r.name ? String(r.name) : null,
      email: r.email ? String(r.email) : null,
      initials: r.initials ? String(r.initials) : null,
      role: r.role ? String(r.role) : null,
      active: typeof r.active === "boolean" ? r.active : null,
    };
  });
}

setTeamByUserId(combined);


      // Keep selected row stable if still present
      if (selectedId && !list.some((x) => x.id === selectedId)) {
        setSelectedId(null);
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feedback.");
      setItems([]);
      setTeamByUserId({});
      setLoading(false);
    }
  }

  useEffect(() => {
    // Only load once authorized + auth check done
    if (!authChecking && authorized) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, authorized, kind]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((i) => {
      const tm = teamByUserId[i.user_id];
      const hay = [
        i.kind,
        i.message,
        i.page_path ?? "",
        i.area ?? "",
        i.location_id ?? "",
        i.user_id ?? "",
        i.created_at ?? "",
        tm?.name ?? "",
        tm?.email ?? "",
        tm?.initials ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [items, q, teamByUserId]);

  async function deleteSelected() {
    if (!selected) return;

    const ok = confirm("Delete this feedback item?\n\nThis is permanent.");
    if (!ok) return;

    try {
      const { error } = await supabase.from("feedback_items").delete().eq("id", selected.id);
      if (error) throw error;

      setItems((prev) => prev.filter((x) => x.id !== selected.id));
      setSelectedId(null);
    } catch (e: any) {
      alert(e?.message ?? "Could not delete feedback item.");
    }
  }

  // While auth is checking, render nothing heavy (prevents data flashing)
  if (authChecking) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading…
        </div>
      </div>
    );
  }

  // If not authorized, we already redirected. Render nothing to avoid flicker.
  if (!authorized) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-extrabold text-slate-900">
            Manager feedback
          </div>
          <div className="text-sm text-slate-500">
            Trial + live feedback sent from the app.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search feedback..."
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 sm:w-72"
          />

          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All types</option>
            <option value="bug">Bug</option>
            <option value="confusing">Confusing</option>
            <option value="idea">Idea</option>
            <option value="other">Other</option>
          </select>

          <button
            type="button"
            onClick={load}
            className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-black"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Inbox list */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
              Inbox
            </div>
          </div>

          {error ? (
            <div className="p-4 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="p-4 text-sm text-slate-600">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-600">No feedback found.</div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {filtered.map((i) => {
                  const active = i.id === selectedId;
                  const tm = teamByUserId[i.user_id] ?? null;
                  const u = displayUser(i.user_id, tm);

                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(i.id)}
                        className={cls(
                          "w-full px-4 py-3 text-left",
                          active ? "bg-slate-50" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                                {i.kind}
                              </span>
                              <span className="text-xs text-slate-500">
                                {fmtDDMMYYYY(i.created_at)} {fmtTimeHHMM(i.created_at)}
                              </span>
                              {tm?.initials ? (
                                <span className="text-xs font-semibold text-slate-700">
                                  {tm.initials}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                              {i.message}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <span>
                                Page:{" "}
                                <span className="font-mono">
                                  {i.page_path ?? "—"}
                                </span>
                              </span>
                              <span>
                                Area:{" "}
                                <span className="font-mono">{i.area ?? "—"}</span>
                              </span>
                              <span>
                                User: <span className="font-mono">{u.primary}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono">
                            {shortId(i.id)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-600">
              Details
            </div>
          </div>

          {!selected ? (
            <div className="p-4 text-sm text-slate-600">
              Select an item to view details.
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {selected.kind}
                  </div>
                  <div className="text-xs text-slate-500">
                    {fmtDDMMYYYY(selected.created_at)} {fmtTimeHHMM(selected.created_at)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={deleteSelected}
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                  title="Delete feedback"
                >
                  Delete
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600">Message</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                  {selected.message}
                </div>
              </div>

              {(() => {
                const tm = teamByUserId[selected.user_id] ?? null;
                const u = displayUser(selected.user_id, tm);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">User</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {u.primary}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {u.secondary}
                      {tm?.role ? <> · {tm.role}</> : null}
                      {tm?.active === false ? <> · inactive</> : null}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500">
                      {selected.user_id}
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Page</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.page_path ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Area</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.area ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Location ID
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.location_id ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Feedback ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.id}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600">Meta</div>
                <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-800">
                  {JSON.stringify(selected.meta ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
