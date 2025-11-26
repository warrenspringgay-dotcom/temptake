// src/components/FoodHygieneRatingLog.tsx
"use client";

import React, { useEffect, useState } from "react";
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

function RatingStars({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return (
      <div className="text-center text-slate-400 text-xs">No rating</div>
    );
  }

  const rating = Math.max(0, Math.min(MAX_FHR_RATING, Math.round(value)));

  return (
    <div className="flex flex-col items-center leading-tight">
      {/* Number */}
      <div className="text-2xl font-bold text-slate-900 mb-1">
        {rating}
      </div>

      {/* Stars */}
      <div className="flex gap-1 text-amber-500 text-xl">
        {Array.from({ length: MAX_FHR_RATING }).map((_, i) => (
          <span key={i}>{i < rating ? "★" : "☆"}</span>
        ))}
      </div>
    </div>
  );
}


const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
        setLoading(false);
        return;
      }
      const locationId = await getActiveLocationIdClient();

      let query = supabase
        .from("food_hygiene_ratings")
        .select("*")
        .eq("org_id", orgId)
        .order("visit_date", { ascending: false });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

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
        issuing_authority: authority || null,
        reference: reference || null,
        notes: notes || null,
      };

      const { error } = await supabase
        .from("food_hygiene_ratings")
        .insert(payload);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Food Hygiene Rating Log
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Record and track your official food hygiene rating over time.
        </p>
      </div>

      {/* Current rating summary */}
      <div className="rounded-3xl border border-white/30 bg-white/80 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Current rating
            </div>
            {latest ? (
              <>
                <div className="mt-1 flex items-baseline gap-3">
                  <div className="flex h-20 w-28 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-100 text-3xl font-bold text-emerald-900 shadow-sm">
  <RatingStars value={latest.rating} />
</div>

                  <div className="text-sm text-slate-700">
                    Awarded on{" "}
                    <span className="font-medium">
                      {formatDate(latest.visit_date)}
                    </span>
                    {latest.certificate_expires_at && (
                      <>
                        {" "}
                        • Expires{" "}
                        <span className="font-medium">
                          {formatDate(latest.certificate_expires_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {latest.issuing_authority && (
                  <div className="mt-1 text-xs text-slate-500">
                    Issued by {latest.issuing_authority}
                    {latest.reference && ` • Ref ${latest.reference}`}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-sm text-slate-600">
                No food hygiene ratings logged yet. Add your current rating
                using the form on the right.
              </div>
            )}
          </div>

          {/* small yearly summary */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Entries this year
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {
                rows.filter((r) => {
                  const d = new Date(r.visit_date);
                  return d.getFullYear() === new Date().getFullYear();
                }).length
              }
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Keep a record of any re-visits or re-ratings throughout the year.
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>

      {/* Form + history */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Form */}
        <div className="rounded-3xl border border-white/30 bg-white/80 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900">
            Add / update rating
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Log each official inspection or change in rating. The newest entry
            will be treated as your current rating.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs font-medium text-slate-700">
                  Rating (0–5)
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={rating}
                  onChange={(e) =>
                    setRating(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  required
                >
                  <option value="">Select rating…</option>
                  {[5, 4, 3, 2, 1, 0].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-slate-700">
                  Inspection date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex-1 min-w-[160px]">
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

            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[160px]">
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
              <div className="w-full sm:flex-1 sm:min-w-[120px]">
                <label className="block text-xs font-medium text-slate-700">
                  Reference (optional)
                </label>
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
              <label className="block text-xs font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                rows={3}
                placeholder="Any inspection comments, follow-ups, appeals, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className={cls(
                  "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/30",
                  "bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500",
                  saving && "opacity-70 cursor-not-allowed"
                )}
              >
                {saving ? "Saving…" : "Save rating"}
              </button>
            </div>
          </form>
        </div>

        {/* History */}
        <div className="rounded-3xl border border-white/30 bg-white/80 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900">
            Rating history
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Full log of ratings for this year and previous years.
          </p>

          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto text-sm">
            {loading ? (
              <div className="py-4 text-center text-sm text-slate-500">
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                No ratings recorded yet.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-10 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 text-base font-semibold text-emerald-900">
                        {r.rating}
                      </span>
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(r.visit_date)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.issuing_authority || "Authority not set"}
                          {r.reference && ` • Ref ${r.reference}`}
                        </div>
                      </div>
                    </div>
                    {r.notes && (
                      <div className="mt-1 text-xs text-slate-600">
                        {r.notes}
                      </div>
                    )}
                  </div>
                  {r.certificate_expires_at && (
                    <div className="whitespace-nowrap text-[11px] text-slate-500">
                      Expires
                      <br />
                      <span className="font-medium">
                        {formatDate(r.certificate_expires_at)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
