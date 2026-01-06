// src/app/manager/feedback/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

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

export default function ManagerFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setError("No active organisation found.");
        setItems([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("feedback_items")
        .select(
          "id,kind,message,page_path,area,location_id,user_id,created_at,meta"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (kind !== "all") query = query.eq("kind", kind);

      const { data, error: e } = await query;
      if (e) throw e;

      const list = (data ?? []) as FeedbackItem[];
      setItems(list);

      // Keep selected row stable if still present
      if (selectedId && !list.some((x) => x.id === selectedId)) {
        setSelectedId(null);
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feedback.");
      setItems([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((i) => {
      const hay = [
        i.kind,
        i.message,
        i.page_path ?? "",
        i.area ?? "",
        i.location_id ?? "",
        i.user_id ?? "",
        i.created_at ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [items, q]);

  async function deleteSelected() {
    if (!selected) return;

    const ok = confirm(
      "Delete this feedback item?\n\nThis is permanent."
    );
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
                                {fmtDDMMYYYY(i.created_at)}{" "}
                                {fmtTimeHHMM(i.created_at)}
                              </span>
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
                                <span className="font-mono">
                                  {i.area ?? "—"}
                                </span>
                              </span>
                              <span>
                                User:{" "}
                                <span className="font-mono">
                                  {shortId(i.user_id)}
                                </span>
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
                    {fmtDDMMYYYY(selected.created_at)}{" "}
                    {fmtTimeHHMM(selected.created_at)}
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
                  <div className="text-xs font-semibold text-slate-600">User ID</div>
                  <div className="mt-1 font-mono text-xs text-slate-900">
                    {selected.user_id}
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
