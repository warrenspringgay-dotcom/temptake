"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type FeedbackStatus = "received" | "in_progress" | "resolved";

type Item = {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  area: string | null;
  location_id: string | null;
  created_at: string;
  user_id: string;
  status: FeedbackStatus;
  admin_reply: string | null;
  admin_reply_at: string | null;
  resolved_at: string | null;
};

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

function statusLabel(status?: string | null) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Received";
}

function statusPillClass(status?: string | null) {
  if (status === "resolved") {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  return "bg-slate-100 text-slate-800 border border-slate-200";
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setError("No active organisation found.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setError("You must be signed in to view feedback.");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("feedback_items")
        .select(
          "id,kind,message,page_path,area,location_id,created_at,user_id,status,admin_reply,admin_reply_at,resolved_at"
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(300);

      if (kind !== "all") query = query.eq("kind", kind);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error: e } = await query;
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }

      setItems((data ?? []) as Item[]);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feedback.");
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, statusFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((i) => {
      const hay = [
        i.kind,
        i.status,
        i.message,
        i.admin_reply ?? "",
        i.page_path ?? "",
        i.area ?? "",
        i.location_id ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-extrabold text-slate-900">My feedback</div>
          <div className="text-sm text-slate-500">
            Track issues, ideas and replies from TempTake.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400 sm:w-64"
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            onClick={load}
            className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {error ? (
          <div className="p-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="p-4 text-sm text-slate-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">
            No feedback yet. Use the feedback button in the app to send your first message.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((i) => (
              <div key={i.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                        {i.kind}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
                          i.status
                        )}`}
                      >
                        {statusLabel(i.status)}
                      </span>

                      <span className="text-xs text-slate-500">
                        {fmtDDMMYYYY(i.created_at)} {fmtTimeHHMM(i.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-900">
                      {i.message}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>
                        Page: <span className="font-mono">{i.page_path ?? "—"}</span>
                      </span>
                      <span>
                        Area: <span className="font-mono">{i.area ?? "—"}</span>
                      </span>
                      <span>
                        Location: <span className="font-mono">{i.location_id ?? "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Reply from TempTake
                  </div>

                  {i.admin_reply?.trim() ? (
                    <>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                        {i.admin_reply}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Updated {fmtDDMMYYYY(i.admin_reply_at)} {fmtTimeHHMM(i.admin_reply_at)}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-500">
                      No reply yet. Your feedback has still been recorded.
                    </div>
                  )}
                </div>

                {i.resolved_at ? (
                  <div className="mt-2 text-[11px] text-slate-500">
                    Resolved on {fmtDDMMYYYY(i.resolved_at)} {fmtTimeHHMM(i.resolved_at)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}