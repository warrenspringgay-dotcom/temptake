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

type FindingCategory =
  | "cleaning"
  | "structure"
  | "cross_contamination"
  | "allergens"
  | "documentation"
  | "training"
  | "pest_control"
  | "management"
  | "other";

type FindingPriority = "low" | "medium" | "high";

type FindingDraft = {
  category: FindingCategory;
  priority: FindingPriority;
  finding_text: string;
  due_date: string;
};

const MAX_FHR_RATING = 5;

const FINDING_CATEGORIES: { value: FindingCategory; label: string }[] = [
  { value: "cleaning", label: "Cleaning" },
  { value: "structure", label: "Structure / maintenance" },
  { value: "cross_contamination", label: "Cross-contamination" },
  { value: "allergens", label: "Allergens" },
  { value: "documentation", label: "Documentation / records" },
  { value: "training", label: "Training" },
  { value: "pest_control", label: "Pest control" },
  { value: "management", label: "Management / supervision" },
  { value: "other", label: "Other" },
];

const FINDING_PRIORITIES: { value: FindingPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// shared “dashboard standard” wrappers
const PAGE = "max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-5";
const GLASS =
  "rounded-3xl border border-white/40 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur";
const SUBTLE =
  "rounded-2xl border border-slate-200 bg-white/90 shadow-sm";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

function emptyFinding(): FindingDraft {
  return {
    category: "other",
    priority: "medium",
    finding_text: "",
    due_date: "",
  };
}

export default function FoodHygieneRatingLog() {
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // rating form state
  const [rating, setRating] = useState<number | "">("");
  const [visitDate, setVisitDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [authority, setAuthority] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // inspection feedback state
  const [officerName, setOfficerName] = useState("");
  const [inspectionSummary, setInspectionSummary] = useState("");
  const [showFindings, setShowFindings] = useState(false);
  const [findings, setFindings] = useState<FindingDraft[]>([emptyFinding()]);

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
    void loadRows();
  }, []);

  function resetForm() {
    setRating("");
    setVisitDate("");
    setExpiresDate("");
    setAuthority("");
    setReference("");
    setNotes("");
    setOfficerName("");
    setInspectionSummary("");
    setShowFindings(false);
    setFindings([emptyFinding()]);
    setErr(null);
  }

  function updateFinding(index: number, patch: Partial<FindingDraft>) {
    setFindings((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addFinding() {
    setFindings((current) => [...current, emptyFinding()]);
  }

  function removeFinding(index: number) {
    setFindings((current) =>
      current.length <= 1 ? [emptyFinding()] : current.filter((_, i) => i !== index)
    );
  }

  const preparedFindings = useMemo(
    () =>
      findings
        .map((f) => ({
          ...f,
          finding_text: f.finding_text.trim(),
          due_date: f.due_date.trim(),
        }))
        .filter((f) => f.finding_text.length > 0),
    [findings]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === "" || !visitDate) return;

    setSaving(true);
    setErr(null);

    try {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) throw new Error("No organisation selected.");
      const locationId = await getActiveLocationIdClient();

      const ratingPayload = {
        org_id: orgId,
        location_id: locationId ?? null,
        rating: Number(rating),
        visit_date: visitDate,
        certificate_expires_at: expiresDate || null,
        issuing_authority: authority.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      };

      const { error: ratingError } = await supabase
        .from("food_hygiene_ratings")
        .insert(ratingPayload);

      if (ratingError) throw ratingError;

      const shouldCreateInspection =
        preparedFindings.length > 0 ||
        officerName.trim().length > 0 ||
        inspectionSummary.trim().length > 0 ||
        authority.trim().length > 0 ||
        reference.trim().length > 0 ||
        notes.trim().length > 0;

      if (shouldCreateInspection) {
        const inspectionPayload = {
          org_id: orgId,
          location_id: locationId ?? null,
          inspection_date: visitDate,
          food_hygiene_rating: Number(rating),
          inspecting_authority: authority.trim() || null,
          officer_name: officerName.trim() || null,
          reference: reference.trim() || null,
          summary: inspectionSummary.trim() || notes.trim() || null,
        };

        const { data: inspectionRow, error: inspectionError } = await supabase
          .from("food_hygiene_inspections")
          .insert(inspectionPayload)
          .select("id")
          .single();

        if (inspectionError) throw inspectionError;

        if (preparedFindings.length > 0) {
          const findingRows = preparedFindings.map((f) => ({
            inspection_id: inspectionRow.id,
            org_id: orgId,
            location_id: locationId ?? null,
            category: f.category,
            priority: f.priority,
            status: "open",
            finding_text: f.finding_text,
            due_date: f.due_date || null,
          }));

          const { error: findingsError } = await supabase
            .from("food_hygiene_inspection_findings")
            .insert(findingRows);

          if (findingsError) throw findingsError;
        }
      }

      resetForm();
      await loadRows();
    } catch (e: any) {
      console.error("Food hygiene save error", e);
      setErr(e?.message || "Failed to save food hygiene record.");
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
      <header className="text-center space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Food hygiene rating log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Track your inspection rating, certificate expiry, and history in one place.
        </p>
      </header>

      <section className={cls(GLASS, "p-4 space-y-3")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={cls(GLASS, "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add / update rating</h2>
              <p className="mt-1 text-xs text-slate-500">
                Newest entry becomes the current rating. Keep it simple, keep it accurate.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Inspector / officer name (optional)
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="Officer name"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <input
                    type="checkbox"
                    checked={showFindings}
                    onChange={(e) => setShowFindings(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-slate-700">Add inspection findings</span>
                </label>
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

            {showFindings && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Inspection feedback / findings
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Capture the actual pointers from the inspection so they can flow into manager
                    review instead of rotting inside a generic notes box like forgotten lettuce.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Inspection summary (optional)
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    rows={3}
                    placeholder="Overall inspection summary or key takeaways..."
                    value={inspectionSummary}
                    onChange={(e) => setInspectionSummary(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  {findings.map((finding, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Finding {index + 1}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFinding(index)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Category
                          </label>
                          <select
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                            value={finding.category}
                            onChange={(e) =>
                              updateFinding(index, {
                                category: e.target.value as FindingCategory,
                              })
                            }
                          >
                            {FINDING_CATEGORIES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Priority
                          </label>
                          <select
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                            value={finding.priority}
                            onChange={(e) =>
                              updateFinding(index, {
                                priority: e.target.value as FindingPriority,
                              })
                            }
                          >
                            {FINDING_PRIORITIES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700">
                            Due date (optional)
                          </label>
                          <input
                            type="date"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                            value={finding.due_date}
                            onChange={(e) =>
                              updateFinding(index, { due_date: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700">
                          Finding text
                        </label>
                        <textarea
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                          rows={3}
                          placeholder="e.g. Probe calibration records were not up to date and staff could not show recent checks."
                          value={finding.finding_text}
                          onChange={(e) =>
                            updateFinding(index, { finding_text: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addFinding}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Add another finding
                </button>
              </div>
            )}

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
                onClick={resetForm}
                className={cls(
                  "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50",
                  saving && "opacity-70 cursor-not-allowed"
                )}
              >
                Clear
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              Tip: if you only know the rating and visit date, that’s enough. Add findings when you
              want inspection points tracked properly.
            </div>
          </form>
        </div>

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
              onClick={() => void loadRows()}
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
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 22,
                      delay: Math.min(idx * 0.03, 0.15),
                    }}
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

                        {r.notes && <div className="mt-2 text-xs text-slate-700">{r.notes}</div>}
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