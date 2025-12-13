// src/components/FoodHygieneRatingLog.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

type RatingRow = {
  id: string;
  org_id: string;
  location_id: string | null;
  rating: number;
  visit_date: string; // yyyy-mm-dd
  certificate_expires_at: string | null;
  issuing_authority: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

const MAX_FHR_RATING = 5;

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// shared “dashboard standard” wrappers
const PAGE = "max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-5";
const GLASS =
  "rounded-3xl border border-white/40 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur";
const SUBTLE =
  "rounded-2xl border border-slate-200 bg-white/90 shadow-sm";

// UK-ish friendly formatting (but safe everywhere)
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfYearISO() {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff;
}

function RatingStars({ value }: { value: number | null }) {
  const v =
    value == null || Number.isNaN(value)
      ? null
      : Math.max(0, Math.min(MAX_FHR_RATING, Math.round(value)));

  return (
    <div className="flex items-center gap-1 text-amber-500 text-base leading-none">
      {Array.from({ length: MAX_FHR_RATING }).map((_, i) => (
        <span key={i}>{v != null && i < v ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function FoodHygieneRatingLog() {
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [rating, setRating] = useState<number | "">("");
  const [visitDate, setVisitDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [authority, setAuthority] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  async function loadRows() {
    setLoading(true);
    setErr(null);
    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) {
        setRows([]);
        return;
      }
      const locationId = await getActiveLocationIdClient();

      let query = supabase
        .from("food_hygiene_ratings")
        .select("*")
        .eq("org_id", orgId)
        .order("visit_date", { ascending: false });

      if (locationId) query = query.eq("location_id", locationId);

      const { data, error } = await query;
      if (error) throw error;

      setRows(
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          org_id: String(r.org_id),
          location_id: r.location_id ? String(r.location_id) : null,
          rating: Number(r.rating),
          visit_date: r.visit_date,
          certificate_expires_at: r.certificate_expires_at,
          issuing_authority: r.issuing_authority,
          reference: r.reference,
          notes: r.notes,
          created_at: r.created_at,
        }))
      );
    } catch (e: any) {
      console.error("Food hygiene load error", e);
      setErr(e?.message || "Failed to load food hygiene ratings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === "" || !visitDate) return;

    setSaving(true);
    setErr(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) throw new Error("No organisation selected.");
      const locationId = await getActiveLocationIdClient();

      const payload = {
        org_id: orgId,
        location_id: locationId ?? null,
        rating: Number(rating),
        visit_date: visitDate,
        certificate_expires_at: expiresDate || null,
        issuing_authority: authority.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      };

      const { error } = await supabase.from("food_hygiene_ratings").insert(payload);
      if (error) throw error;

      // reset form
      setRating("");
      setVisitDate("");
      setExpiresDate("");
      setAuthority("");
      setReference("");
      setNotes("");

      await loadRows();
    } catch (e: any) {
      console.error("Food hygiene save error", e);
      setErr(e?.message || "Failed to save rating.");
    } finally {
      setSaving(false);
    }
  }

  const latest = rows[0] ?? null;

  const entriesThisYear = useMemo(() => {
    const y0 = startOfYearISO();
    return rows.filter((r) => r.visit_date >= y0).length;
  }, [rows]);

  const daysSinceLast = useMemo(() => {
    if (!latest?.visit_date) return null;
    const todayISO = new Date().toISOString().slice(0, 10);
    return Math.max(0, daysBetween(latest.visit_date, todayISO));
  }, [latest]);

  const expiryStatus = useMemo(() => {
    if (!latest?.certificate_expires_at) return null;
    const todayISO = new Date().toISOString().slice(0, 10);
    const diff = daysBetween(todayISO, latest.certificate_expires_at);
    const overdue = diff < 0;
    const soon = diff >= 0 && diff <= 60;
    return { diff, overdue, soon };
  }, [latest]);

  return (
    <div className={PAGE}>
      {/* Header */}
      <header className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Food hygiene rating log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Track your inspection rating, certificate expiry, and history in one place.
        </p>
      </header>

      {/* Top summary row (dashboard-style KPI cards) */}
      <section className={cls(GLASS, "p-4 space-y-3")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Current rating */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={cls(
              "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[110px]",
              latest
                ? latest.rating >= 4
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                  : latest.rating >= 3
                  ? "border-amber-200 bg-amber-50/90 text-amber-900"
                  : "border-red-200 bg-red-50/90 text-red-800"
                : "border-slate-200 bg-white/90 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between text-slate-600 font-bold tracking-[0.18em] uppercase">
              <span>Current rating</span>
              <span className="text-base" aria-hidden="true">
                🍽️
              </span>
            </div>

            {latest ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="text-3xl font-semibold leading-none">{latest.rating}</div>
                <div className="min-w-0">
                  <RatingStars value={latest.rating} />
                  <div className="mt-1 text-[11px] opacity-80">
                    Awarded {formatDate(latest.visit_date)}
                    {daysSinceLast != null ? ` • ${daysSinceLast}d ago` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-600">
                No rating logged yet. Add your latest inspection below.
              </div>
            )}
          </motion.div>

          {/* Certificate / expiry */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
            className={cls(
              "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[110px]",
              latest?.certificate_expires_at
                ? expiryStatus?.overdue
                  ? "border-red-200 bg-red-50/90 text-red-800"
                  : expiryStatus?.soon
                  ? "border-amber-200 bg-amber-50/90 text-amber-900"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                : "border-slate-200 bg-white/90 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between text-slate-600 font-bold tracking-[0.18em] uppercase">
              <span>Certificate</span>
              <span className="text-base" aria-hidden="true">
                🧾
              </span>
            </div>

            {latest?.certificate_expires_at ? (
              <div className="mt-2">
                <div className="text-2xl font-semibold leading-none">
                  {formatDate(latest.certificate_expires_at)}
                </div>
                <div className="mt-1 text-[11px] opacity-80">
                  {expiryStatus?.overdue
                    ? `${Math.abs(expiryStatus.diff)} days overdue`
                    : expiryStatus
                    ? `Due in ${expiryStatus.diff} days`
                    : ""}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-600">
                No expiry saved. Optional, but useful for reminders.
              </div>
            )}
          </motion.div>

          {/* Entries this year */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className={cls(
              "rounded-2xl border p-3 shadow-sm text-sm flex flex-col justify-between min-h-[110px]",
              "border-slate-200 bg-white/90 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between text-slate-600 font-bold tracking-[0.18em] uppercase">
              <span>Entries (year)</span>
              <span className="text-base" aria-hidden="true">
                📅
              </span>
            </div>
            <div className="mt-2 text-3xl font-semibold leading-none">{entriesThisYear}</div>
            <div className="mt-1 text-[11px] text-slate-500">
              Keeps your audit trail clean when inspections change.
            </div>
          </motion.div>
        </div>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-800">
            {err}
          </div>
        )}
      </section>

      {/* Form + history */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Form */}
        <div className={cls(GLASS, "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add / update rating</h2>
              <p className="mt-1 text-xs text-slate-500">
                Newest entry becomes the current rating. Keep it simple, keep it accurate.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Rating (0–5)</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={rating}
                  onChange={(e) =>
                    setRating(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                >
                  <option value="">Select…</option>
                  {[5, 4, 3, 2, 1, 0].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Inspection date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Certificate expiry (optional)
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={expiresDate}
                  onChange={(e) => setExpiresDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Issuing authority (optional)
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g. Local Council / FSA"
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Reference (optional)</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="Certificate no / case ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Notes (optional)</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                rows={3}
                placeholder="Inspection comments, actions required, appeal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className={cls(
                  "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                  "bg-slate-900 hover:bg-black",
                  saving && "opacity-70 cursor-not-allowed"
                )}
              >
                {saving ? "Saving…" : "Save rating"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setRating("");
                  setVisitDate("");
                  setExpiresDate("");
                  setAuthority("");
                  setReference("");
                  setNotes("");
                  setErr(null);
                }}
                className={cls(
                  "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50",
                  saving && "opacity-70 cursor-not-allowed"
                )}
              >
                Clear
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              Tip: if you only know the rating and visit date, that’s enough. Everything else is optional.
            </div>
          </form>
        </div>

        {/* History */}
        <div className={cls(GLASS, "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Rating history</h2>
              <p className="mt-1 text-xs text-slate-500">
                Full log for this location. Newest first.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRows}
              disabled={loading}
              className={cls(
                "rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto text-sm pr-1">
            {loading ? (
              <div className={cls(SUBTLE, "p-3 text-center text-sm text-slate-500")}>
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className={cls(SUBTLE, "p-3 text-center text-sm text-slate-500")}>
                No ratings recorded yet.
              </div>
            ) : (
              rows.map((r, idx) => {
                const isCurrent = idx === 0;
                const badge =
                  r.rating >= 4
                    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                    : r.rating >= 3
                    ? "bg-amber-100 text-amber-900 border-amber-200"
                    : "bg-red-100 text-red-900 border-red-200";

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22, delay: Math.min(idx * 0.03, 0.15) }}
                    className={cls(
                      "rounded-2xl border bg-white/90 px-3 py-2 shadow-sm",
                      isCurrent ? "border-slate-300" : "border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cls(
                              "inline-flex h-9 w-12 items-center justify-center rounded-xl border text-base font-semibold",
                              badge
                            )}
                          >
                            {r.rating}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">
                                {formatDate(r.visit_date)}
                              </div>
                              {isCurrent && (
                                <span className="inline-flex rounded-full bg-slate-900 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white">
                                  Current
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                              <span>{r.issuing_authority || "Authority not set"}</span>
                              {r.reference && <span>• Ref {r.reference}</span>}
                              <span className="inline-flex items-center gap-1">
                                <span className="text-amber-500">★</span>
                                <span className="text-slate-600">
                                  <RatingStars value={r.rating} />
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {r.notes && (
                          <div className="mt-2 text-xs text-slate-700">
                            {r.notes}
                          </div>
                        )}
                      </div>

                      {r.certificate_expires_at && (
                        <div className="shrink-0 text-right text-[11px] text-slate-500">
                          <div>Expires</div>
                          <div className="font-semibold text-slate-700">
                            {formatDate(r.certificate_expires_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
