"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

const SUPERADMIN_USER_ID = "16baae4d-e077-4c89-b402-2b5d725539e8";

type AppFeedbackStatus = "received" | "in_progress" | "resolved";
type InspectionFindingStatus = "open" | "in_progress" | "resolved";
type UnifiedStatus =
  | AppFeedbackStatus
  | InspectionFindingStatus
  | null;

type StreamSource = "app_feedback" | "inspection";

type ManagerFeedbackStreamItem = {
  id: string;
  org_id: string;
  location_id: string | null;
  actor_user_id: string | null;
  created_at: string;
  source: StreamSource;
  source_kind: string;
  category: string | null;
  inspection_id: string | null;
  inspection_date: string | null;
  food_hygiene_rating: number | null;
  priority: string | null;
  status: string | null;
  message: string;
  page_path: string | null;
  meta: any;
};

type FeedbackItemRow = {
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
  status: AppFeedbackStatus;
  admin_reply: string | null;
  admin_reply_at: string | null;
  resolved_at: string | null;
  updated_at: string | null;
};

type UnifiedItem = ManagerFeedbackStreamItem & {
  app_status: AppFeedbackStatus | null;
  app_admin_reply: string | null;
  app_admin_reply_at: string | null;
  app_resolved_at: string | null;
  app_updated_at: string | null;

  inspection_resolved_at: string | null;
  inspection_resolved_note: string | null;
  inspection_due_date: string | null;
  inspection_authority: string | null;
  inspection_officer_name: string | null;
  inspection_summary: string | null;
};

type TeamMemberLite = {
  user_id: string | null;
  name: string | null;
  email: string | null;
  initials: string | null;
  role: string | null;
  active: boolean | null;
};

type OrgLite = {
  id: string;
  name: string | null;
};

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function fmtDDMMYYYY(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtTimeHHMM(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function shortId(id?: string | null) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

function displayUser(
  userId: string | null,
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
    primary: "Unknown user",
    secondary: shortId(userId),
  };
}

function displayOrg(orgId: string, org?: OrgLite | null) {
  if (org?.name?.trim()) return org.name.trim();
  return shortId(orgId);
}

function sourceLabel(source: StreamSource) {
  return source === "inspection" ? "Inspection" : "App feedback";
}

function sourcePillClass(source: StreamSource) {
  return source === "inspection"
    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
    : "bg-slate-900 text-white border border-slate-900";
}

function appStatusLabel(status?: AppFeedbackStatus | null) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Received";
}

function inspectionStatusLabel(status?: InspectionFindingStatus | null) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Open";
}

function unifiedStatusLabel(item: UnifiedItem) {
  if (item.source === "inspection") {
    return inspectionStatusLabel(
      (item.status as InspectionFindingStatus | null) ?? "open"
    );
  }
  return appStatusLabel(item.app_status ?? "received");
}

function unifiedStatusValue(item: UnifiedItem): UnifiedStatus {
  if (item.source === "inspection") {
    return (item.status as InspectionFindingStatus | null) ?? "open";
  }
  return item.app_status ?? "received";
}

function unifiedStatusPillClass(item: UnifiedItem) {
  const status = unifiedStatusValue(item);

  if (status === "resolved") {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (status === "open") {
    return "bg-rose-100 text-rose-800 border border-rose-200";
  }
  return "bg-slate-100 text-slate-800 border border-slate-200";
}

function priorityPillClass(priority?: string | null) {
  if (priority === "high") {
    return "bg-rose-100 text-rose-800 border border-rose-200";
  }
  if (priority === "medium") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (priority === "low") {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function prettyCategory(category?: string | null) {
  if (!category) return "—";
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normaliseMeta(meta: any) {
  const obj = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
  return {
    inspecting_authority:
      typeof obj.inspecting_authority === "string" ? obj.inspecting_authority : null,
    officer_name: typeof obj.officer_name === "string" ? obj.officer_name : null,
    summary: typeof obj.summary === "string" ? obj.summary : null,
    resolved_at: typeof obj.resolved_at === "string" ? obj.resolved_at : null,
    resolved_note: typeof obj.resolved_note === "string" ? obj.resolved_note : null,
    due_date: typeof obj.due_date === "string" ? obj.due_date : null,
  };
}

export default function ManagerFeedbackPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [teamByUserId, setTeamByUserId] = useState<Record<string, TeamMemberLite>>(
    {}
  );
  const [orgById, setOrgById] = useState<Record<string, OrgLite>>({});

  const [editAppStatus, setEditAppStatus] = useState<AppFeedbackStatus>("received");
  const [editReply, setEditReply] = useState("");

  const [editInspectionStatus, setEditInspectionStatus] =
    useState<InspectionFindingStatus>("open");
  const [editResolvedNote, setEditResolvedNote] = useState("");

  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

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

  useEffect(() => {
    if (!selected) return;

    if (selected.source === "inspection") {
      setEditInspectionStatus(
        (selected.status as InspectionFindingStatus | null) ?? "open"
      );
      setEditResolvedNote(selected.inspection_resolved_note ?? "");
      setEditReply("");
      setEditAppStatus("received");
      return;
    }

    setEditAppStatus(selected.app_status ?? "received");
    setEditReply(selected.app_admin_reply ?? "");
    setEditInspectionStatus("open");
    setEditResolvedNote("");
  }, [selected]);

  async function load() {
    if (!authorized) return;

    setLoading(true);
    setError(null);

    try {
      let streamQuery = supabase
        .from("manager_feedback_stream")
        .select(
          "id,org_id,location_id,actor_user_id,created_at,source,source_kind,category,inspection_id,inspection_date,food_hygiene_rating,priority,status,message,page_path,meta"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (sourceFilter !== "all") {
        streamQuery = streamQuery.eq("source", sourceFilter);
      }

      const { data: streamData, error: streamError } = await streamQuery;
      if (streamError) throw streamError;

      const rawStream = (streamData ?? []) as ManagerFeedbackStreamItem[];

      const appIds = rawStream
        .filter((row) => row.source === "app_feedback")
        .map((row) => row.id);

      const appDetailsById: Record<string, FeedbackItemRow> = {};

      if (appIds.length > 0) {
        const { data: appRows, error: appError } = await supabase
          .from("feedback_items")
          .select(
            "id,kind,message,page_path,area,location_id,user_id,created_at,meta,org_id,status,admin_reply,admin_reply_at,resolved_at,updated_at"
          )
          .in("id", appIds);

        if (appError) throw appError;

        (appRows ?? []).forEach((row: any) => {
          const id = String(row.id);
          appDetailsById[id] = {
            id,
            kind: String(row.kind ?? ""),
            message: String(row.message ?? ""),
            page_path: row.page_path ? String(row.page_path) : null,
            area: row.area ? String(row.area) : null,
            location_id: row.location_id ? String(row.location_id) : null,
            user_id: String(row.user_id),
            created_at: String(row.created_at),
            meta: row.meta ?? {},
            org_id: String(row.org_id),
            status: (row.status ?? "received") as AppFeedbackStatus,
            admin_reply: row.admin_reply ? String(row.admin_reply) : null,
            admin_reply_at: row.admin_reply_at ? String(row.admin_reply_at) : null,
            resolved_at: row.resolved_at ? String(row.resolved_at) : null,
            updated_at: row.updated_at ? String(row.updated_at) : null,
          };
        });
      }

      const list: UnifiedItem[] = rawStream.map((row) => {
        const appDetail = row.source === "app_feedback" ? appDetailsById[row.id] : null;
        const meta = normaliseMeta(row.meta);

        return {
          ...row,
          app_status: appDetail?.status ?? null,
          app_admin_reply: appDetail?.admin_reply ?? null,
          app_admin_reply_at: appDetail?.admin_reply_at ?? null,
          app_resolved_at: appDetail?.resolved_at ?? null,
          app_updated_at: appDetail?.updated_at ?? null,

          inspection_resolved_at: meta.resolved_at,
          inspection_resolved_note: meta.resolved_note,
          inspection_due_date: meta.due_date,
          inspection_authority: meta.inspecting_authority,
          inspection_officer_name: meta.officer_name,
          inspection_summary: meta.summary,
        };
      });

      const byOrg = new Map<string, string[]>();
      const orgIds = new Set<string>();

      for (const row of list) {
        if (row.org_id) orgIds.add(row.org_id);

        if (!row.org_id || !row.actor_user_id) continue;
        const arr = byOrg.get(row.org_id) ?? [];
        arr.push(row.actor_user_id);
        byOrg.set(row.org_id, arr);
      }

      const combinedUsers: Record<string, TeamMemberLite> = {};

      for (const [oid, uids] of byOrg.entries()) {
        const unique = Array.from(new Set(uids)).slice(0, 500);

        const { data: teamData, error: teamError } = await supabase
          .from("team_members")
          .select("user_id,name,email,initials,role,active")
          .eq("org_id", oid)
          .in("user_id", unique);

        if (teamError) {
          console.warn("team_members lookup failed for org:", oid, teamError.message);
          continue;
        }

        (teamData ?? []).forEach((r: any) => {
          const uid = r.user_id ? String(r.user_id) : null;
          if (!uid) return;
          combinedUsers[uid] = {
            user_id: uid,
            name: r.name ? String(r.name) : null,
            email: r.email ? String(r.email) : null,
            initials: r.initials ? String(r.initials) : null,
            role: r.role ? String(r.role) : null,
            active: typeof r.active === "boolean" ? r.active : null,
          };
        });
      }

      setTeamByUserId(combinedUsers);

      const uniqueOrgIds = Array.from(orgIds);
      if (uniqueOrgIds.length > 0) {
        const { data: orgData, error: orgError } = await supabase
          .from("orgs")
          .select("id,name")
          .in("id", uniqueOrgIds);

        if (orgError) {
          console.warn("org lookup failed:", orgError.message);
          setOrgById({});
        } else {
          const combinedOrgs: Record<string, OrgLite> = {};
          (orgData ?? []).forEach((r: any) => {
            const id = r.id ? String(r.id) : null;
            if (!id) return;
            combinedOrgs[id] = {
              id,
              name: r.name ? String(r.name) : null,
            };
          });
          setOrgById(combinedOrgs);
        }
      } else {
        setOrgById({});
      }

      setItems(list);

      if (list.length > 0) {
        setSelectedId((prev) => {
          if (prev && list.some((x) => x.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setSelectedId(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feedback.");
      setItems([]);
      setTeamByUserId({});
      setOrgById({});
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authChecking && authorized) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, authorized, sourceFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return items.filter((i) => {
      const tm = i.actor_user_id ? teamByUserId[i.actor_user_id] : null;
      const org = orgById[i.org_id];
      const effectiveStatus = unifiedStatusValue(i);

      if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
        return false;
      }

      if (!needle) return true;

      const hay = [
        i.source,
        i.source_kind,
        i.category ?? "",
        i.message,
        i.page_path ?? "",
        i.location_id ?? "",
        i.actor_user_id ?? "",
        i.created_at ?? "",
        i.priority ?? "",
        i.inspection_id ?? "",
        i.inspection_date ?? "",
        i.food_hygiene_rating != null ? String(i.food_hygiene_rating) : "",
        i.app_admin_reply ?? "",
        i.inspection_resolved_note ?? "",
        i.inspection_authority ?? "",
        i.inspection_officer_name ?? "",
        i.inspection_summary ?? "",
        tm?.name ?? "",
        tm?.email ?? "",
        tm?.initials ?? "",
        org?.name ?? "",
        i.org_id ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [items, q, statusFilter, teamByUserId, orgById]);

  async function saveSelected() {
    if (!selected) return;

    setSaving(true);

    try {
      const nowIso = new Date().toISOString();

      if (selected.source === "inspection") {
        const nextStatus = editInspectionStatus;
        const nextResolvedNote = editResolvedNote.trim() || null;

        const payload: {
          status: InspectionFindingStatus;
          resolved_at: string | null;
          resolved_note: string | null;
          updated_at: string;
        } = {
          status: nextStatus,
          resolved_at: nextStatus === "resolved" ? nowIso : null,
          resolved_note: nextResolvedNote,
          updated_at: nowIso,
        };

        const { error } = await supabase
          .from("food_hygiene_inspection_findings")
          .update(payload)
          .eq("id", selected.id);

        if (error) throw error;

        await load();
        setSelectedId(selected.id);
        return;
      }

      const nextStatus = editAppStatus;
      const nextReply = editReply.trim() || null;

      const payload: {
        status: AppFeedbackStatus;
        admin_reply: string | null;
        admin_reply_at: string | null;
        resolved_at: string | null;
        updated_at: string;
      } = {
        status: nextStatus,
        admin_reply: nextReply,
        admin_reply_at: nextReply ? nowIso : null,
        resolved_at: nextStatus === "resolved" ? nowIso : null,
        updated_at: nowIso,
      };

      const { error } = await supabase
        .from("feedback_items")
        .update(payload)
        .eq("id", selected.id);

      if (error) throw error;

      await load();
      setSelectedId(selected.id);
    } catch (e: any) {
      alert(e?.message ?? "Could not save update.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;

    const label =
      selected.source === "inspection"
        ? "Delete this inspection finding?\n\nThis is permanent."
        : "Delete this feedback item?\n\nThis is permanent.";

    const ok = confirm(label);
    if (!ok) return;

    try {
      if (selected.source === "inspection") {
        const { error } = await supabase
          .from("food_hygiene_inspection_findings")
          .delete()
          .eq("id", selected.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("feedback_items")
          .delete()
          .eq("id", selected.id);

        if (error) throw error;
      }

      setItems((prev) => prev.filter((x) => x.id !== selected.id));
      setSelectedId(null);
    } catch (e: any) {
      alert(e?.message ?? "Could not delete item.");
    }
  }

  if (authChecking) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading…
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-extrabold text-slate-900">Manager feedback</div>
          <div className="text-sm text-slate-500">
            Internal inbox for app feedback and inspection findings.
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
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All sources</option>
            <option value="app_feedback">App feedback</option>
            <option value="inspection">Inspection findings</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={() => void load()}
            className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-black"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
                  const tm = i.actor_user_id ? teamByUserId[i.actor_user_id] ?? null : null;
                  const org = orgById[i.org_id] ?? null;
                  const u = displayUser(i.actor_user_id, tm);

                  return (
                    <li key={`${i.source}-${i.id}`}>
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
                              <span
                                className={cls(
                                  "rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide",
                                  sourcePillClass(i.source)
                                )}
                              >
                                {sourceLabel(i.source)}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                {i.source === "inspection"
                                  ? prettyCategory(i.category)
                                  : i.source_kind}
                              </span>

                              <span
                                className={cls(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  unifiedStatusPillClass(i)
                                )}
                              >
                                {unifiedStatusLabel(i)}
                              </span>

                              {i.source === "inspection" && i.priority ? (
                                <span
                                  className={cls(
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    priorityPillClass(i.priority)
                                  )}
                                >
                                  {i.priority}
                                </span>
                              ) : null}

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
                                Org:{" "}
                                <span className="font-medium text-slate-700">
                                  {displayOrg(i.org_id, org)}
                                </span>
                              </span>

                              {i.source === "inspection" ? (
                                <>
                                  <span>
                                    Inspection date:{" "}
                                    <span className="font-medium text-slate-700">
                                      {fmtDDMMYYYY(i.inspection_date)}
                                    </span>
                                  </span>
                                  <span>
                                    Rating:{" "}
                                    <span className="font-medium text-slate-700">
                                      {i.food_hygiene_rating ?? "—"}
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>
                                    Page:{" "}
                                    <span className="font-mono">{i.page_path ?? "—"}</span>
                                  </span>
                                  <span>
                                    Area:{" "}
                                    <span className="font-mono">{i.category ?? "—"}</span>
                                  </span>
                                </>
                              )}

                              <span>
                                User:{" "}
                                <span className="font-medium text-slate-700">
                                  {u.primary}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="font-mono text-[11px] text-slate-400">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cls(
                        "rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide",
                        sourcePillClass(selected.source)
                      )}
                    >
                      {sourceLabel(selected.source)}
                    </span>

                    <span className="text-sm font-extrabold text-slate-900">
                      {selected.source === "inspection"
                        ? prettyCategory(selected.category)
                        : selected.source_kind}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={cls(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        unifiedStatusPillClass(selected)
                      )}
                    >
                      {unifiedStatusLabel(selected)}
                    </span>

                    {selected.source === "inspection" && selected.priority ? (
                      <span
                        className={cls(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          priorityPillClass(selected.priority)
                        )}
                      >
                        {selected.priority}
                      </span>
                    ) : null}

                    <span className="text-xs text-slate-500">
                      {fmtDDMMYYYY(selected.created_at)} {fmtTimeHHMM(selected.created_at)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void deleteSelected()}
                  className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                  title={selected.source === "inspection" ? "Delete finding" : "Delete feedback"}
                >
                  Delete
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600">
                  {selected.source === "inspection" ? "Finding" : "Message"}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                  {selected.message}
                </div>
              </div>

              {(() => {
                const tm = selected.actor_user_id
                  ? teamByUserId[selected.actor_user_id] ?? null
                  : null;
                const u = displayUser(selected.actor_user_id, tm);

                return (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-600">
                      {selected.source === "inspection" ? "Recorded by" : "User"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {u.primary}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {u.secondary}
                      {tm?.role ? <> · {tm.role}</> : null}
                      {tm?.active === false ? <> · inactive</> : null}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Linked auth user: {shortId(selected.actor_user_id)}
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Organisation</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {displayOrg(selected.org_id, orgById[selected.org_id])}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Org ID: {shortId(selected.org_id)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Location ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.location_id ?? "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">Item ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.id}
                  </div>
                </div>

                {selected.source === "inspection" ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Inspection date
                      </div>
                      <div className="mt-1 text-xs text-slate-900">
                        {fmtDDMMYYYY(selected.inspection_date)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Food hygiene rating
                      </div>
                      <div className="mt-1 text-xs text-slate-900">
                        {selected.food_hygiene_rating ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Authority
                      </div>
                      <div className="mt-1 text-xs text-slate-900">
                        {selected.inspection_authority ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Officer
                      </div>
                      <div className="mt-1 text-xs text-slate-900">
                        {selected.inspection_officer_name ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-600">
                        Inspection summary
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-xs text-slate-900">
                        {selected.inspection_summary ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">Due date</div>
                      <div className="mt-1 text-xs text-slate-900">
                        {fmtDDMMYYYY(selected.inspection_due_date)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Inspection ID
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-900">
                        {selected.inspection_id ?? "—"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">Page</div>
                      <div className="mt-1 font-mono text-xs text-slate-900">
                        {selected.page_path ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">Area</div>
                      <div className="mt-1 font-mono text-xs text-slate-900">
                        {selected.category ?? "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {selected.source === "inspection" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Status
                      </label>
                      <select
                        value={editInspectionStatus}
                        onChange={(e) =>
                          setEditInspectionStatus(
                            e.target.value as InspectionFindingStatus
                          )
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <div className="mt-2 text-[11px] text-slate-500">
                        Resolved on: {fmtDDMMYYYY(selected.inspection_resolved_at)}
                        {selected.inspection_resolved_at
                          ? ` ${fmtTimeHHMM(selected.inspection_resolved_at)}`
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-600">
                        Current note
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                        {selected.inspection_resolved_note?.trim()
                          ? selected.inspection_resolved_note
                          : "No resolution note yet"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Resolution / manager note
                    </label>
                    <textarea
                      value={editResolvedNote}
                      onChange={(e) => setEditResolvedNote(e.target.value)}
                      placeholder="What was done, what still needs doing, or why it is resolved..."
                      rows={6}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => void saveSelected()}
                        disabled={saving}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save update"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Status
                      </label>
                      <select
                        value={editAppStatus}
                        onChange={(e) => setEditAppStatus(e.target.value as AppFeedbackStatus)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                      >
                        <option value="received">Received</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>

                      <div className="mt-2 text-[11px] text-slate-500">
                        Resolved on: {fmtDDMMYYYY(selected.app_resolved_at)}
                        {selected.app_resolved_at
                          ? ` ${fmtTimeHHMM(selected.app_resolved_at)}`
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-600">Last reply</div>
                      <div className="mt-1 text-sm text-slate-900">
                        {selected.app_admin_reply?.trim() ? "Reply saved" : "No reply yet"}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {selected.app_admin_reply_at
                          ? `Updated ${fmtDDMMYYYY(selected.app_admin_reply_at)} ${fmtTimeHHMM(
                              selected.app_admin_reply_at
                            )}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Reply to user
                    </label>
                    <textarea
                      value={editReply}
                      onChange={(e) => setEditReply(e.target.value)}
                      placeholder="Write a reply the user will see on their feedback page..."
                      rows={6}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => void saveSelected()}
                        disabled={saving}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save update"}
                      </button>
                    </div>
                  </div>
                </>
              )}

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