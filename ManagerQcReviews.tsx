"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type StaffRow = {
  id: string;
  initials: string | null;
  name: string | null;
};

type QcRow = {
  id: string;
  reviewed_on: string;
  score: number;
  notes: string | null;
  staff_id: string;
  manager_id: string;
  location_id: string | null;
  staff?: { initials: string | null; name: string | null } | null;
  manager?: { initials: string | null; name: string | null } | null;
};

function formatWho(s?: { initials: string | null; name: string | null } | null) {
  const ini = (s?.initials ?? "").trim().toUpperCase();
  const nm = (s?.name ?? "").trim();
  if (ini && nm) return `${ini} · ${nm}`;
  if (ini) return ini;
  if (nm) return nm;
  return "—";
}

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function ManagerQcReviews() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [reviews, setReviews] = useState<QcRow[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    staff_id: "",
    manager_id: "",
    reviewed_on: new Date().toISOString().slice(0, 10),
    score: 3,
    notes: "",
  });

  const [saving, setSaving] = useState(false);

  async function boot() {
    const [oid, lid] = await Promise.all([
      getActiveOrgIdClient(),
      getActiveLocationIdClient().catch(() => null),
    ]);
    setOrgId(oid ?? null);
    setLocationId(lid ?? null);
  }

  async function loadStaff(oid: string) {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id,initials,name")
        .eq("org_id", oid)
        .order("initials", { ascending: true });

      if (error) throw error;
      setStaff((data ?? []) as StaffRow[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load staff list.");
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }

  async function loadReviews(oid: string) {
    setLoadingReviews(true);
    try {
      // pull staff + manager display via FK joins
      const { data, error } = await supabase
        .from("staff_qc_reviews")
        .select(
          `
          id,
          reviewed_on,
          score,
          notes,
          staff_id,
          manager_id,
          location_id,
          staff:staff!staff_qc_reviews_staff_fkey(initials,name),
          manager:staff!staff_qc_reviews_manager_fkey(initials,name)
        `
        )
        .eq("org_id", oid)
        .order("reviewed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setReviews((data ?? []) as QcRow[]);
    } catch (e: any) {
      alert(e?.message ?? "Failed to load QC reviews.");
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await boot();
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      await Promise.all([loadStaff(orgId), loadReviews(orgId)]);
    })();
  }, [orgId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reviews;
    return reviews.filter((r) => {
      const staffText = formatWho(r.staff).toLowerCase();
      const mgrText = formatWho(r.manager).toLowerCase();
      const notesText = (r.notes ?? "").toLowerCase();
      const dateText = (r.reviewed_on ?? "").toLowerCase();
      return (
        staffText.includes(term) ||
        mgrText.includes(term) ||
        notesText.includes(term) ||
        dateText.includes(term) ||
        String(r.score).includes(term)
      );
    });
  }, [reviews, q]);

  async function addReview() {
    if (!orgId) return alert("No organisation found.");
    if (!form.staff_id) return alert("Pick a staff member.");
    if (!form.manager_id) return alert("Pick a manager.");
    if (!form.reviewed_on) return alert("Pick a date.");

    const score = Number(form.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return alert("Score must be between 1 and 5.");
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("staff_qc_reviews").insert({
        org_id: orgId,
        staff_id: form.staff_id,
        manager_id: form.manager_id,
        location_id: locationId ?? null,
        reviewed_on: form.reviewed_on,
        score,
        notes: form.notes?.trim() || null,
      });

      if (error) throw error;

      setForm((f) => ({
        ...f,
        reviewed_on: new Date().toISOString().slice(0, 10),
        score: 3,
        notes: "",
      }));

      await loadReviews(orgId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save QC review.");
    } finally {
      setSaving(false);
    }
  }

  async function removeReview(id: string) {
    if (!confirm("Delete this QC review?")) return;
    if (!orgId) return;

    try {
      const { error } = await supabase.from("staff_qc_reviews").delete().eq("id", id).eq("org_id", orgId);
      if (error) throw error;
      await loadReviews(orgId);
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete QC review.");
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Manager QC</h2>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <input
            className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/80 px-3 text-sm text-slate-900 placeholder:text-slate-400 md:w-64"
            placeholder="Search reviews…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            onClick={() => orgId && loadReviews(orgId)}
            className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-900">Add QC review</div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs text-slate-500">Staff</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
              value={form.staff_id}
              onChange={(e) => setForm((f) => ({ ...f, staff_id: e.target.value }))}
              disabled={loadingStaff}
            >
              <option value="">{loadingStaff ? "Loading…" : "Select staff…"}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.initials ?? "—").toString().toUpperCase()} {s.name ? `· ${s.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs text-slate-500">Manager</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
              value={form.manager_id}
              onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))}
              disabled={loadingStaff}
            >
              <option value="">{loadingStaff ? "Loading…" : "Select manager…"}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.initials ?? "—").toString().toUpperCase()} {s.name ? `· ${s.name}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-500">
              Manager must exist in <code className="rounded bg-slate-100 px-1">staff</code>.
            </div>
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs text-slate-500">Date</label>
            <input
              type="date"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
              value={form.reviewed_on}
              onChange={(e) => setForm((f) => ({ ...f, reviewed_on: e.target.value }))}
            />
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs text-slate-500">Score</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
              value={form.score}
              onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}/5
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="mb-1 block text-xs text-slate-500">Notes</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 text-sm"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional…"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void addReview()}
            disabled={saving}
            className={cls(
              "rounded-xl px-4 py-2 text-sm font-medium text-white",
              saving ? "bg-slate-400" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {saving ? "Saving…" : "Add review"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Staff</th>
                <th className="py-2 px-3">Manager</th>
                <th className="py-2 px-3">Score</th>
                <th className="py-2 px-3">Notes</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loadingReviews ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 align-top">
                    <td className="py-2 px-3 whitespace-nowrap">{r.reviewed_on}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{formatWho(r.staff)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{formatWho(r.manager)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={cls(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          r.score >= 4
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : r.score === 3
                            ? "bg-amber-50 text-amber-800 border border-amber-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}
                      >
                        {r.score}/5
                      </span>
                    </td>
                    <td className="py-2 px-3 min-w-[260px]">{r.notes ?? "—"}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => void removeReview(r.id)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-slate-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    No QC reviews yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        Uses <code className="rounded bg-slate-100 px-1">staff_qc_reviews</code> (org scoped). Location is auto-filled if a
        location is active.
      </div>
    </div>
  );
}
