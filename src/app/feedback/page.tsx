// src/app/feedback/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Item = {
  id: string;
  kind: string;
  message: string;
  page_path: string | null;
  area: string | null;
  location_id: string | null;
  created_at: string;
  user_id: string;
};

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<string>("all");
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

      let query = supabase
        .from("feedback_items")
        .select(
          "id,kind,message,page_path,area,location_id,created_at,user_id"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(300);

      if (kind !== "all") query = query.eq("kind", kind);

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
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xl font-extrabold text-slate-900">Feedback</div>
          <div className="text-sm text-slate-500">
            Internal inbox for trial + live users.
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
          <div className="p-4 text-sm text-slate-600">No feedback yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Page</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((i) => (
                  <tr key={i.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fmtDDMMYYYY(i.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                      {i.kind}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{i.message}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs">
                        {i.page_path ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {i.area ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs">
                        {i.user_id.slice(0, 8)}…
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
