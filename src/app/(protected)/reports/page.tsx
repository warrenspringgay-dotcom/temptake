// src/app/(protected)/reports/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

import Button from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";

/* ===================== Types ===================== */

type TempRow = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  staff: string;
  location: string;
  item: string;
  temp_c: number | null;
  target_key: string | null;
  status: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  email?: string | null;
  initials?: string | null;
  expires_on: string | null; // ISO date or ISO datetime
  days_until?: number | null;
};

type AllergenRow = {
  id: string;
  reviewed_on: string | null; // ISO date/datetime
  next_due: string | null; // ISO datetime
  reviewer: string | null;
  interval_days: number | null;
  days_until?: number | null;
};

type AllergenChangeRow = {
  id: string;
  created_at: string | null;
  item_name: string | null;
  action: string | null;
  staff_initials: string | null;
};

type StaffReviewRow = {
  id: string;
  reviewed_on: string;
  created_at: string | null;
  staff_name: string;
  staff_initials: string | null;
  location_name: string | null;
  reviewer: string | null;
  rating: number;
  notes: string | null;
};

type EducationRow = {
  id: string;
  staff_name: string;
  staff_initials: string | null;
  staff_email: string | null;
  type: string | null;
  awarded_on: string | null; // ISO datetime
  expires_on: string | null; // ISO datetime
  days_until: number | null;
  status: "valid" | "expired" | "no-expiry";
  notes: string | null;
  certificate_url: string | null;
};

type LocationOption = {
  id: string;
  name: string;
};

type LoggedIncidentRow = {
  id: string;
  happened_on: string | null; // yyyy-mm-dd
  type: string | null;
  details: string | null;
  immediate_action: string | null;
  preventive_action: string | null;
  created_by: string | null;
  created_at: string | null; // ISO datetime
};

type SignoffRow = {
  id: string;
  signoff_on: string; // yyyy-mm-dd
  signed_by: string | null;
  notes: string | null;
  created_at: string | null; // ISO datetime
};

type CleaningRunRow = {
  id: string;
  run_on: string; // yyyy-mm-dd
  done_at: string | null; // ISO datetime
  done_by: string | null;
  category: string;
  task: string;
};

type TrainingAreaStatus = "green" | "amber" | "red" | "unknown";

type TrainingAreaRow = {
  member_id: string;
  name: string;
  initials: string | null;
  email: string | null;
  area: string;
  selected: boolean;
  awarded_on: string | null; // ISO date
  expires_on: string | null; // ISO date
  days_until: number | null;
  status: TrainingAreaStatus;
};

type UnifiedIncidentRow = {
  id: string;
  happened_on: string | null; // yyyy-mm-dd
  created_at: string | null; // ISO datetime
  type: string | null;
  created_by: string | null;
  details: string | null;
  corrective_action: string | null;
  source: "incident" | "temp_fail";
};

/* ===================== Calibration ===================== */

type CalibrationAsset = {
  id: string;
  name: string;
  asset_type: "Fridge" | "Freezer" | "Probe" | string;
  interval_days: number;
};

type CalibrationCheck = {
  id: string;
  asset_id: string;
  checked_on: string; // yyyy-mm-dd
  staff_initials: string | null;
  method: string | null;
  result: string | null;
  notes: string | null;
  created_at: string | null;
  asset_name: string;
  asset_type: string;
  interval_days: number;
};

type CalibrationDueRow = {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  interval_days: number;
  last_checked_on: string | null; // yyyy-mm-dd
  next_due_on: string | null; // yyyy-mm-dd
  days_until: number | null;
  status: "overdue" | "due_soon" | "ok" | "unknown";
};

/* ===================== Food Hygiene Rating ===================== */

type HygieneMeta = {
  rating: number | null;
  visit_date: string | null; // yyyy-mm-dd
  certificate_expires_at: string | null; // yyyy-mm-dd
  issuing_authority: string | null;
  reference: string | null;
};

type HygieneHistoryRow = {
  id: string;
  rating: number | null;
  visit_date: string | null; // yyyy-mm-dd
  certificate_expires_at: string | null; // yyyy-mm-dd
  issuing_authority: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
};

/* ===================== Date helpers ===================== */

function safeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(val: any): string {
  const d = safeDate(val) ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// DD/MM/YYYY
function formatISOToUK(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimeHM(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function addDaysISO(ymd: string, days: number): string {
  const d = new Date(ymd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return ymd;

  d.setDate(d.getDate() + days);

  return d.toISOString().slice(0, 10);
}


function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ===================== Type guards ===================== */

function isTeamRow(v: TeamRow | null): v is TeamRow {
  return v !== null;
}

/* ===================== Small helper: optional location_id filter with fallback ===================== */

function isMissingLocationColumnError(err: any) {
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("column") && msg.includes("location_id") && msg.includes("does not exist");
}

/* ===================== Training areas ===================== */

const SFBB_AREAS = [
  "Cross-contamination",
  "Cleaning",
  "Chilling",
  "Cooking",
  "Allergens",
  "Management",
] as const;

type TrainingAreasValue =
  | null
  | undefined
  | string[]
  | Record<string, any>
  | Array<{
      area?: string;
      name?: string;
      awarded_on?: any;
      expires_on?: any;
      added_on?: any;
    }>;

function normaliseKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "");
}

function canonicalAreaName(raw: string): (typeof SFBB_AREAS)[number] | null {
  const k = normaliseKey(raw);

  const map: Record<string, (typeof SFBB_AREAS)[number]> = {
    crosscontamination: "Cross-contamination",
    crosscontam: "Cross-contamination",

    cleaning: "Cleaning",
    clean: "Cleaning",
    hygiene: "Cleaning",
    sanitation: "Cleaning",

    chilling: "Chilling",
    chill: "Chilling",
    refrigeration: "Chilling",
    fridge: "Chilling",
    freezer: "Chilling",

    cooking: "Cooking",
    cook: "Cooking",
    hot: "Cooking",
    hotholding: "Cooking",
    reheating: "Cooking",

    allergens: "Allergens",
    allergen: "Allergens",
    allergy: "Allergens",

    management: "Management",
    manager: "Management",
    supervisory: "Management",
    supervision: "Management",
    admin: "Management",
  };

  if (map[k]) return map[k];

  if (k.includes("cross") && k.includes("contam")) return "Cross-contamination";
  if (k.includes("clean")) return "Cleaning";
  if (k.includes("chill") || k.includes("fridge") || k.includes("freez")) return "Chilling";
  if (k.includes("cook") || k.includes("hot") || k.includes("reheat")) return "Cooking";
  if (k.includes("allerg")) return "Allergens";
  if (k.includes("manage") || k.includes("supervis")) return "Management";

  return null;
}

function normaliseTrainingAreas(
  val: TrainingAreasValue
): Record<string, { awarded_on?: string; expires_on?: string }> {
  const out: Record<string, { awarded_on?: string; expires_on?: string }> = {};
  if (!val) return out;

  const setArea = (areaRaw: string, awarded: any, expires: any) => {
    const canon = canonicalAreaName(String(areaRaw ?? "").trim());
    if (!canon) return;
    out[canon] = {
      awarded_on: awarded ? toISODate(awarded) : undefined,
      expires_on: expires ? toISODate(expires) : undefined,
    };
  };

  if (Array.isArray(val) && val.every((x) => typeof x === "string")) {
    for (const area of val as string[]) setArea(area, null, null);
    return out;
  }

  if (Array.isArray(val)) {
    for (const item of val as any[]) {
      const area = String(item?.area ?? item?.name ?? "").trim();
      if (!area) continue;

      const awarded = item?.awarded_on ?? item?.added_on ?? null;
      const expires = item?.expires_on ?? null;

      setArea(area, awarded, expires);
    }
    return out;
  }

  if (typeof val === "object") {
    for (const [area, meta] of Object.entries(val as Record<string, any>)) {
      const awarded = (meta as any)?.awarded_on ?? (meta as any)?.added_on ?? null;
      const expires = (meta as any)?.expires_on ?? null;
      setArea(String(area), awarded, expires);
    }
    return out;
  }

  return out;
}

/* ===================== Hygiene stars (big >=3, small <3, history small) ===================== */

function HygieneStars({
  rating,
  variant = "auto",
}: {
  rating: number | null;
  variant?: "auto" | "big" | "small";
}) {
  if (rating == null) {
    return <span className="text-slate-500 text-sm">No rating</span>;
  }

  const isGood = rating >= 3;
  const totalStars = 5;

  const sizeClass =
    variant === "big"
      ? "text-3xl"
      : variant === "small"
      ? "text-lg"
      : isGood
      ? "text-3xl"
      : "text-xl";

  const dimmed = variant === "small" ? "opacity-80" : isGood ? "" : "opacity-80";

  return (
    <div className="flex items-center gap-2">
      <div className={`flex text-yellow-500 ${dimmed}`}>
        {Array.from({ length: totalStars }).map((_, i) => {
          const filled = i < rating;
          return (
            <span
              key={i}
              className={`${sizeClass} leading-none ${filled ? "" : "text-slate-300"}`}
              aria-hidden
            >
              ★
            </span>
          );
        })}
      </div>

      <span
        className={`font-semibold ${
          variant === "small"
            ? "text-slate-700 text-xs"
            : isGood
            ? "text-slate-900 text-base"
            : "text-slate-700 text-sm"
        }`}
      >
        {rating}/5
      </span>
    </div>
  );
}

/* ===================== Training status compute ===================== */

function computeTrainingStatus(awardedISO: string | null, expiresISO: string | null) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const awarded = safeDate(awardedISO);
  const expires = safeDate(expiresISO);

  let effectiveExpires: Date | null = expires;
  if (!effectiveExpires && awarded) effectiveExpires = addDays(awarded, 365);

  if (!awarded && !effectiveExpires) {
    return {
      expires_on: null as string | null,
      days_until: null as number | null,
      status: "unknown" as TrainingAreaStatus,
    };
  }

  const exp0 = effectiveExpires ? new Date(effectiveExpires) : null;
  if (exp0) exp0.setHours(0, 0, 0, 0);

  const days_until = exp0
    ? Math.round((exp0.getTime() - today0.getTime()) / 86400000)
    : null;

  if (days_until == null)
    return { expires_on: null, days_until: null, status: "unknown" as TrainingAreaStatus };
  if (days_until < 0)
    return { expires_on: toISODate(exp0!), days_until, status: "red" as TrainingAreaStatus };
  if (days_until <= 30)
    return { expires_on: toISODate(exp0!), days_until, status: "amber" as TrainingAreaStatus };
  return { expires_on: toISODate(exp0!), days_until, status: "green" as TrainingAreaStatus };
}

async function fetchTrainingAreasReport(
  orgId: string,
  locationId: string | null
): Promise<TrainingAreaRow[]> {
  const rows: TrainingAreaRow[] = [];

  async function fetchFromTeamMembers(): Promise<any[] | null> {
    if (locationId) {
      const { data: d1, error: e1 } = await supabase
        .from("team_members")
        .select("id,name,initials,email,active,training_areas,location_id")
        .eq("org_id", orgId)
        .eq("location_id", locationId)
        .order("name", { ascending: true })
        .limit(5000);

      if (e1) {
        if (!isMissingLocationColumnError(e1)) throw e1;
      } else if ((d1?.length ?? 0) > 0) {
        return d1 as any[];
      }
    }

    const { data: d2, error: e2 } = await supabase
      .from("team_members")
      .select("id,name,initials,email,active,training_areas")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
      .limit(5000);

    if (e2) throw e2;

    return (d2 ?? []) as any[];
  }

  let data = await fetchFromTeamMembers();
  if (!data || data.length === 0) return [];

  for (const m of data) {
    if (m.active === false) continue;

    const member_id = String(m.id);
    const name = String(m.name ?? "—");
    const initials = m.initials ? String(m.initials) : null;
    const email = m.email ? String(m.email) : null;

    const normal = normaliseTrainingAreas(m.training_areas as TrainingAreasValue);

    for (const area of SFBB_AREAS) {
      const areaKey = String(area);
      const selected = Object.prototype.hasOwnProperty.call(normal, areaKey);

      const meta = selected ? (normal[areaKey] ?? {}) : {};
      const awarded_on = meta.awarded_on ?? null;
      const expires_on_in = meta.expires_on ?? null;

      const computed = computeTrainingStatus(awarded_on, expires_on_in);

      rows.push({
        member_id,
        name,
        initials,
        email,
        area: areaKey,
        selected,
        awarded_on,
        expires_on: computed.expires_on,
        days_until: computed.days_until,
        status: computed.status,
      });
    }
  }

  return rows;
}

/* ===================== Food hygiene ratings fetch ===================== */

async function fetchLatestHygieneByLocation(orgId: string): Promise<Record<string, HygieneMeta>> {
  const { data, error } = await supabase
    .from("food_hygiene_ratings")
    .select("location_id, rating, visit_date, certificate_expires_at, issuing_authority, reference")
    .eq("org_id", orgId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  const map: Record<string, HygieneMeta> = {};

  for (const r of (data ?? []) as any[]) {
    const locId = r.location_id ? String(r.location_id) : null;
    if (!locId) continue;
    if (map[locId]) continue;

    map[locId] = {
      rating: r.rating != null ? Number(r.rating) : null,
      visit_date: r.visit_date ? String(r.visit_date) : null,
      certificate_expires_at: r.certificate_expires_at ? String(r.certificate_expires_at) : null,
      issuing_authority: r.issuing_authority ? String(r.issuing_authority) : null,
      reference: r.reference ? String(r.reference) : null,
    };
  }

  return map;
}

async function fetchHygieneHistoryForLocation(
  orgId: string,
  locationId: string
): Promise<HygieneHistoryRow[]> {
  const { data, error } = await supabase
    .from("food_hygiene_ratings")
    .select(
      "id, rating, visit_date, certificate_expires_at, issuing_authority, reference, notes, created_at"
    )
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    rating: r.rating != null ? Number(r.rating) : null,
    visit_date: r.visit_date ? String(r.visit_date) : null,
    certificate_expires_at: r.certificate_expires_at ? String(r.certificate_expires_at) : null,
    issuing_authority: r.issuing_authority ? String(r.issuing_authority) : null,
    reference: r.reference ? String(r.reference) : null,
    notes: r.notes ? String(r.notes) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

/* ===================== Data fetch helpers ===================== */

async function fetchTemps(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<TempRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let query = supabase
    .from("food_temp_logs")
    .select("*")
    .eq("org_id", orgId)
    .gte("at", fromStart)
    .lte("at", toEnd)
    .order("at", { ascending: false })
    .limit(3000);

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    date: toISODate(r.at ?? r.created_at),
    staff: r.staff_initials ?? r.initials ?? "—",
    location: r.area ?? "—",
    item: r.note ?? "—",
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    target_key: r.target_key ?? null,
    status: r.status ?? null,
  }));
}

async function fetchTempFailuresUnified(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<UnifiedIncidentRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let q = supabase
    .from("food_temp_logs")
    .select("id, at, area, note, temp_c, target_key, status, staff_initials, location_id")
    .eq("org_id", orgId)
    .eq("status", "fail")
    .gte("at", fromStart)
    .lte("at", toEnd)
    .order("at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", locationId);

  const { data: failLogs, error: failErr } = await q;
  if (failErr) throw failErr;

  const logs = (failLogs ?? []) as any[];
  if (!logs.length) return [];

  const ids = logs.map((r) => String(r.id));

  let caQ = supabase
    .from("food_temp_corrective_actions")
    .select(
      "id, temp_log_id, action, recheck_temp_c, recheck_at, recheck_status, recorded_by, created_at, location_id"
    )
    .eq("org_id", orgId)
    .in("temp_log_id", ids)
    .limit(5000);

  if (locationId) caQ = caQ.eq("location_id", locationId);

  const { data: caRows, error: caErr } = await caQ;
  if (caErr) throw caErr;

  const byLog = new Map<string, any>();
  for (const row of (caRows ?? []) as any[]) {
    const key = String(row.temp_log_id);
    const existing = byLog.get(key);
    if (!existing) {
      byLog.set(key, row);
      continue;
    }
    const a = safeDate(existing.created_at)?.getTime() ?? 0;
    const b = safeDate(row.created_at)?.getTime() ?? 0;
    if (b >= a) byLog.set(key, row);
  }

  return logs.map((l) => {
    const ca = byLog.get(String(l.id)) ?? null;

    const atISO = l.at ? String(l.at) : null;
    const happened_on = toISODate(atISO ?? new Date().toISOString());

    const tempVal = l.temp_c != null ? `${Number(l.temp_c)}°C` : "—";
    const target = l.target_key ? String(l.target_key) : "—";
    const details = `${l.area ?? "—"} • ${l.note ?? "—"} • ${tempVal} (target ${target})`;

    let corrective = ca?.action ? String(ca.action) : null;

    if (ca?.recheck_temp_c != null) {
      const reT = `${Number(ca.recheck_temp_c)}°C`;
      const reAt = ca.recheck_at ? formatTimeHM(String(ca.recheck_at)) : "—";
      const reStatus = ca.recheck_status ? String(ca.recheck_status) : "—";
      const suffix = `Re-check: ${reT} (${reStatus}) at ${reAt}`;
      corrective = corrective ? `${corrective} • ${suffix}` : suffix;
    }

    return {
      id: `temp_fail_${String(l.id)}`,
      happened_on,
      created_at: atISO,
      type: "Temp failure",
      created_by: (ca?.recorded_by ?? l.staff_initials ?? null)
        ? String(ca?.recorded_by ?? l.staff_initials)
        : null,
      details,
      corrective_action: corrective,
      source: "temp_fail" as const,
    };
  });
}

async function fetchCleaningCount(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<number> {
  let query = supabase
    .from("cleaning_task_runs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("run_on", fromISO)
    .lte("run_on", toISO);

  if (locationId) query = query.eq("location_id", locationId);

  const { count, error } = await query;
  if (error || count == null) return 0;
  return count;
}

async function fetchCleaningRunsTrail(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<CleaningRunRow[]> {
  let runsQ = supabase
    .from("cleaning_task_runs")
    .select("id, task_id, run_on, done_at, done_by, location_id")
    .eq("org_id", orgId)
    .gte("run_on", fromISO)
    .lte("run_on", toISO)
    .order("run_on", { ascending: false })
    .order("done_at", { ascending: false })
    .limit(3000);

  if (locationId) runsQ = runsQ.eq("location_id", locationId);

  const { data: runs, error: runsErr } = await runsQ;
  if (runsErr) throw runsErr;

  const runRows = (runs ?? []) as any[];
  if (!runRows.length) return [];

  const taskIds = Array.from(new Set(runRows.map((r) => String(r.task_id)).filter(Boolean)));

  let tasksQ = supabase
    .from("cleaning_tasks")
    .select("id, task, category")
    .eq("org_id", orgId)
    .in("id", taskIds)
    .limit(5000);

  if (locationId) tasksQ = tasksQ.eq("location_id", locationId);

  const { data: tasks, error: tasksErr } = await tasksQ;
  if (tasksErr) throw tasksErr;

  const taskMap = new Map<string, { task: string; category: string }>();
  for (const t of (tasks ?? []) as any[]) {
    taskMap.set(String(t.id), {
      task: String(t.task ?? "—"),
      category: String(t.category ?? "Uncategorised"),
    });
  }

  return runRows.map((r) => {
    const t = taskMap.get(String(r.task_id)) ?? { task: "—", category: "Uncategorised" };
    return {
      id: String(r.id),
      run_on: String(r.run_on),
      done_at: r.done_at ? String(r.done_at) : null,
      done_by: r.done_by ? String(r.done_by) : null,
      category: t.category,
      task: t.task,
    };
  });
}

async function fetchSignoffsTrail(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<SignoffRow[]> {
  let q = supabase
    .from("daily_signoffs")
    .select("id, signoff_on, signed_by, notes, created_at, location_id")
    .eq("org_id", orgId)
    .gte("signoff_on", fromISO)
    .lte("signoff_on", toISO)
    .order("signoff_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    signoff_on: String(r.signoff_on),
    signed_by: r.signed_by ? String(r.signed_by) : null,
    notes: r.notes ? String(r.notes) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchLoggedIncidentsTrail(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<LoggedIncidentRow[]> {
  let q = supabase
    .from("incidents")
    .select(
      "id,org_id,location_id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at"
    )
    .eq("org_id", String(orgId))
    .gte("happened_on", fromISO)
    .lte("happened_on", toISO)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", String(locationId));

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    happened_on: r.happened_on ? String(r.happened_on) : null,
    type: r.type ? String(r.type) : null,
    details: r.details ? String(r.details) : null,
    immediate_action: r.immediate_action ? String(r.immediate_action) : null,
    preventive_action: r.preventive_action ? String(r.preventive_action) : null,
    created_by: r.created_by ? String(r.created_by) : null,
    created_at: r.created_at ? String(r.created_at) : null,
  }));
}

async function fetchIncidentsTrailAsUnifiedIncidentShape(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<
  Array<{
    id: string;
    happened_on: string | null;
    type: string | null;
    details: string | null;
    corrective_action: string | null;
    preventive_action: string | null;
    created_by: string | null;
    created_at: string | null;
  }>
> {
  const inc = await fetchLoggedIncidentsTrail(fromISO, toISO, orgId, locationId);
  return inc.map((r) => ({
    id: r.id,
    happened_on: r.happened_on,
    type: r.type,
    details: r.details,
    corrective_action: r.immediate_action,
    preventive_action: r.preventive_action,
    created_by: r.created_by,
    created_at: r.created_at,
  }));
}

/**
 * Team due: supports team_member_id (preferred) and staff_id (legacy).
 */
async function fetchTeamDue(
  withinDays: number,
  orgId: string,
  locationId: string | null
): Promise<TeamRow[]> {
  let tData: any[] = [];

  // trainings has no location_id in your schema, so we just load org-wide.
  const { data, error } = await supabase
    .from("trainings")
    .select("id, staff_id, team_member_id, expires_on")
    .eq("org_id", orgId)
    .limit(5000);

  if (error) throw error;
  tData = (data ?? []) as any[];

  const trainings = (tData ?? []).filter((t: any) => !!t.expires_on);
  if (!trainings.length) return [];

  const teamIds = Array.from(
    new Set(
      trainings
        .map((t: any) => t.team_member_id)
        .filter((id: any) => typeof id === "string" || typeof id === "number")
        .map((id: any) => String(id))
    )
  );

  const staffIds = Array.from(
    new Set(
      trainings
        .map((t: any) => t.staff_id)
        .filter((id: any) => typeof id === "string" || typeof id === "number")
        .map((id: any) => String(id))
    )
  );

  const peopleMap = new Map<string, { name: string; email: string | null; initials: string | null }>();

  if (teamIds.length) {
    let q = supabase
      .from("team_members")
      .select("id, name, email, initials, location_id")
      .eq("org_id", orgId)
      .in("id", teamIds);

    if (locationId) q = q.eq("location_id", locationId);

    const { data: tm, error: tmErr } = await q;
    if (tmErr) throw tmErr;

    for (const s of tm ?? []) {
      peopleMap.set(`tm:${String(s.id)}`, {
        name: s.name ?? "—",
        email: s.email ?? null,
        initials: s.initials ?? null,
      });
    }
  }

  // legacy fallback
  if (staffIds.length) {
    let q = supabase.from("staff").select("id, name, email, initials").eq("org_id", orgId).in("id", staffIds);
    if (locationId) q = q.eq("location_id", locationId);
    const { data: st, error: stErr } = await q;
    if (stErr) throw stErr;

    for (const s of st ?? []) {
      peopleMap.set(`st:${String(s.id)}`, {
        name: s.name ?? "—",
        email: s.email ?? null,
        initials: s.initials ?? null,
      });
    }
  }

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return trainings
    .map((r: any): TeamRow | null => {
      const exp = safeDate(r.expires_on);
      if (!exp) return null;

      const exp0 = new Date(exp);
      exp0.setHours(0, 0, 0, 0);

      const days_until = Math.round((exp0.getTime() - today0.getTime()) / 86400000);

      const key =
        r.team_member_id != null ? `tm:${String(r.team_member_id)}` :
        r.staff_id != null ? `st:${String(r.staff_id)}` :
        null;

      const staff = key ? (peopleMap.get(key) ?? { name: "—", email: null, initials: null }) : { name: "—", email: null, initials: null };

      return {
        id: String(r.id),
        name: staff.name,
        email: staff.email,
        initials: staff.initials,
        expires_on: exp.toISOString(),
        days_until,
      };
    })
    .filter(isTeamRow)
    .filter((r) => typeof r.days_until === "number" && r.days_until <= withinDays)
    .sort((a: any, b: any) => (a.expires_on || "").localeCompare(b.expires_on || ""));
}

/**
 * ✅ Allergen schedule uses `allergen_review`
 * (single schedule row per org; no location_id in your schema).
 */
async function fetchAllergenLog(
  _withinDays: number,
  orgId: string,
  _locationId: string | null
): Promise<AllergenRow[]> {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("allergen_review")
    .select("id, last_reviewed, interval_days, reviewer, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const reviewed = safeDate(r.last_reviewed);

    const intervalDaysRaw = r.interval_days;
    const interval_days =
      intervalDaysRaw == null || intervalDaysRaw === "" ? null : Number(intervalDaysRaw);

    let nextDue: Date | null = null;
    if (reviewed && interval_days && Number.isFinite(interval_days) && interval_days > 0) {
      nextDue = new Date(reviewed.getTime() + interval_days * 86400000);
    }

    const next0 = nextDue ? new Date(nextDue) : null;
    if (next0) next0.setHours(0, 0, 0, 0);

    const days_until = next0
      ? Math.round((next0.getTime() - today0.getTime()) / 86400000)
      : null;

    return {
      id: String(r.id),
      reviewed_on: reviewed ? reviewed.toISOString() : null,
      next_due: nextDue ? nextDue.toISOString() : null,
      reviewer: r.reviewer ?? null,
      interval_days: interval_days,
      days_until,
    } as AllergenRow;
  });
}

async function fetchAllergenChanges(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<AllergenChangeRow[]> {
  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let q = supabase
    .from("allergen_change_logs")
    .select("id, created_at, item_name, action, staff_initials, org_id, location_id")
    .eq("org_id", orgId)
    .gte("created_at", fromStart)
    .lte("created_at", toEnd)
    .order("created_at", { ascending: false })
    .limit(500);

  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    created_at: r.created_at ?? null,
    item_name: r.item_name ?? null,
    action: r.action ?? null,
    staff_initials: r.staff_initials ?? null,
  }));
}

async function fetchStaffReviews(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<StaffReviewRow[]> {
  let query = supabase
    .from("staff_qc_reviews")
    .select(
      `
      id,
      reviewed_on,
      created_at,
      rating,
      notes,
      staff:staff_id ( name, initials ),
      manager:manager_id ( name, initials ),
      location:location_id ( name )
    `
    )
    .eq("org_id", orgId)
    .gte("reviewed_on", fromISO)
    .lte("reviewed_on", toISO)
    .order("reviewed_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    reviewed_on: toISODate(r.reviewed_on),
    created_at: r.created_at ?? null,
    staff_name: r.staff?.name ?? "—",
    staff_initials: r.staff?.initials ?? null,
    location_name: r.location?.name ?? "—",
    reviewer: r.manager?.initials ?? r.manager?.name ?? "—",
    rating: Number(r.rating),
    notes: r.notes ?? null,
  }));
}

/**
 * ✅ Education/trainings: supports team_member_id (preferred) and staff_id (legacy)
 */
async function fetchEducation(orgId: string, locationId: string | null): Promise<EducationRow[]> {
  let q = supabase
    .from("trainings")
    .select(
      `
      id,
      type,
      awarded_on,
      expires_on,
      certificate_url,
      notes,
      provider_name,
      course_key,
      team_member:team_member_id (
        name,
        email,
        initials,
        location_id
      )
    `
    )
    .eq("org_id", orgId)
    .order("expires_on", { ascending: true })
    .order("awarded_on", { ascending: true });

  // Filter by *team_members.location_id* (the column that actually exists)
  if (locationId) q = q.eq("team_member.location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? []).map((r: any) => {
    const tm = r.team_member ?? {};
    const awarded = safeDate(r.awarded_on);
    const expires = safeDate(r.expires_on);

    const expires0 = expires ? new Date(expires) : null;
    if (expires0) expires0.setHours(0, 0, 0, 0);

    let daysUntil: number | null = null;
    let status: EducationRow["status"] = "no-expiry";

    if (expires0) {
      daysUntil = Math.round((expires0.getTime() - today0.getTime()) / 86400000);
      status = daysUntil < 0 ? "expired" : "valid";
    }

    return {
      id: String(r.id),
      staff_name: tm.name ?? "—",
      staff_initials: tm.initials ?? null,
      staff_email: tm.email ?? null,
      type: r.type ?? null,
      awarded_on: awarded ? awarded.toISOString() : null,
      expires_on: expires ? expires.toISOString() : null,
      days_until: daysUntil,
      status,
      notes: r.notes ?? null,
      certificate_url: r.certificate_url ?? null,
    } as EducationRow;
  });
}

/* ===================== Calibration fetch ===================== */

async function fetchCalibrationDue(
  orgId: string,
  locationId: string | null
): Promise<CalibrationDueRow[]> {
  // Load assets for org + (optionally) location
  let aq = supabase
    .from("calibration_assets")
    .select("id, name, asset_type, interval_days, location_id, active")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("asset_type", { ascending: true })
    .order("name", { ascending: true })
    .limit(5000);

  if (locationId) aq = aq.eq("location_id", locationId);

  const { data: assets, error: aErr } = await aq;
  if (aErr) throw aErr;

  const assetRows = (assets ?? []) as any[];
  if (!assetRows.length) return [];

  const assetIds = assetRows.map((a) => String(a.id));

  // Load last check per asset
  let cq = supabase
    .from("calibration_checks")
    .select("asset_id, checked_on, created_at")
    .eq("org_id", orgId)
    .in("asset_id", assetIds)
    .order("checked_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);

  if (locationId) cq = cq.eq("location_id", locationId);

  const { data: checks, error: cErr } = await cq;
  if (cErr) throw cErr;

  const lastByAsset = new Map<string, string>();
  for (const r of (checks ?? []) as any[]) {
    const id = String(r.asset_id);
    if (lastByAsset.has(id)) continue;
    const checked = r.checked_on ? String(r.checked_on) : null;
    if (checked) lastByAsset.set(id, checked);
  }

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return assetRows.map((a) => {
    const asset_id = String(a.id);
    const interval_days = Number(a.interval_days ?? 30) || 30;

    const last_checked_on = lastByAsset.get(asset_id) ?? null;

    let next_due_on: string | null = null;
    let days_until: number | null = null;
    let status: CalibrationDueRow["status"] = "unknown";

    if (last_checked_on) {
      next_due_on = addDaysISO(last_checked_on, interval_days);
      const due = safeDate(next_due_on);
      if (due) {
        due.setHours(0, 0, 0, 0);
        days_until = Math.round((due.getTime() - today0.getTime()) / 86400000);
        if (days_until < 0) status = "overdue";
        else if (days_until <= 7) status = "due_soon";
        else status = "ok";
      }
    } else {
      // Never checked -> due now
      next_due_on = toISODate(today0);
      days_until = 0;
      status = "due_soon";
    }

    return {
      asset_id,
      asset_name: String(a.name ?? "—"),
      asset_type: String(a.asset_type ?? "Asset"),
      interval_days,
      last_checked_on,
      next_due_on,
      days_until,
      status,
    } as CalibrationDueRow;
  });
}

async function fetchCalibrationChecksTrail(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<CalibrationCheck[]> {
  let aq = supabase
    .from("calibration_assets")
    .select("id, name, asset_type, interval_days, location_id, active")
    .eq("org_id", orgId)
    .eq("active", true)
    .limit(5000);

  if (locationId) aq = aq.eq("location_id", locationId);

  const { data: assets, error: aErr } = await aq;
  if (aErr) throw aErr;

  const assetRows = (assets ?? []) as any[];
  const assetMap = new Map<string, CalibrationAsset>();
  for (const a of assetRows) {
    assetMap.set(String(a.id), {
      id: String(a.id),
      name: String(a.name ?? "—"),
      asset_type: a.asset_type ?? "Asset",
      interval_days: Number(a.interval_days ?? 30) || 30,
    });
  }

  const fromStart = new Date(`${fromISO}T00:00:00.000Z`).toISOString();
  const toEnd = new Date(`${toISO}T23:59:59.999Z`).toISOString();

  let q = supabase
    .from("calibration_checks")
    .select("id, asset_id, checked_on, staff_initials, method, result, notes, created_at, location_id")
    .eq("org_id", orgId)
    .gte("created_at", fromStart)
    .lte("created_at", toEnd)
    .order("checked_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);

  if (locationId) q = q.eq("location_id", locationId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const a = assetMap.get(String(r.asset_id));
    return {
      id: String(r.id),
      asset_id: String(r.asset_id),
      checked_on: r.checked_on ? String(r.checked_on) : "—",
      staff_initials: r.staff_initials ?? null,
      method: r.method ?? null,
      result: r.result ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at ? String(r.created_at) : null,
      asset_name: a?.name ?? "—",
      asset_type: a?.asset_type ?? "Asset",
      interval_days: a?.interval_days ?? 30,
    } as CalibrationCheck;
  });
}

/* ===================== CSV ===================== */

function tempsToCSV(rows: TempRow[]) {
  const header = ["Date", "Staff", "Location", "Item", "Temp (°C)", "Target", "Status"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cells = [
      formatISOToUK(r.date),
      r.staff,
      r.location,
      (r.item ?? "").replaceAll('"', '""'),
      r.temp_c ?? "",
      r.target_key ?? "",
      r.status ?? "",
    ];
    lines.push(cells.map((c) => `"${String(c)}"`).join(","));
  }
  return lines.join("\n");
}

/* ===================== Page ===================== */

export default function ReportsPage() {
  const today = new Date();
  const d30 = new Date(Date.now() - 29 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(toISODate(d30));
  const [to, setTo] = useState(toISODate(today));

  const [orgId, setOrgId] = useState<string | null>(null);

  const [locationFilter, setLocationFilter] = useState<string | "all">("all");
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const [bootReady, setBootReady] = useState(false);

  const [hygieneByLocation, setHygieneByLocation] = useState<Record<string, HygieneMeta>>({});
  const [hygieneHistory, setHygieneHistory] = useState<HygieneHistoryRow[] | null>(null);

  const [temps, setTemps] = useState<TempRow[] | null>(null);
  const [teamDue, setTeamDue] = useState<TeamRow[] | null>(null);
  const [allergenLog, setAllergenLog] = useState<AllergenRow[] | null>(null);
  const [allergenChanges, setAllergenChanges] = useState<AllergenChangeRow[] | null>(null);
  const [staffReviews, setStaffReviews] = useState<StaffReviewRow[] | null>(null);
  const [education, setEducation] = useState<EducationRow[] | null>(null);
  const [cleaningCount, setCleaningCount] = useState(0);

  const [incidents, setIncidents] = useState<UnifiedIncidentRow[] | null>(null);
  const [loggedIncidents, setLoggedIncidents] = useState<LoggedIncidentRow[] | null>(null);

  const [signoffs, setSignoffs] = useState<SignoffRow[] | null>(null);
  const [cleaningRuns, setCleaningRuns] = useState<CleaningRunRow[] | null>(null);

  const [trainingAreas, setTrainingAreas] = useState<TrainingAreaRow[] | null>(null);
  const [showAllTrainingAreas, setShowAllTrainingAreas] = useState(false);

  // Calibration
  const [calibrationDue, setCalibrationDue] = useState<CalibrationDueRow[] | null>(null);
  const [calibrationChecks, setCalibrationChecks] = useState<CalibrationCheck[] | null>(null);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [showAllLoggedIncidents, setShowAllLoggedIncidents] = useState(false);
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);
  const [showAllCleaningRuns, setShowAllCleaningRuns] = useState(false);
  const [showAllStaffReviews, setShowAllStaffReviews] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [initialRunDone, setInitialRunDone] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const visibleTemps = useMemo(() => {
    if (!temps) return null;
    return showAllTemps ? temps : temps.slice(0, 10);
  }, [temps, showAllTemps]);

  const visibleEducation = useMemo(() => {
    if (!education) return null;
    return showAllEducation ? education : education.slice(0, 10);
  }, [education, showAllEducation]);

  const visibleIncidents = useMemo(() => {
    if (!incidents) return null;
    return showAllIncidents ? incidents : incidents.slice(0, 10);
  }, [incidents, showAllIncidents]);

  const visibleLoggedIncidents = useMemo(() => {
    if (!loggedIncidents) return null;
    return showAllLoggedIncidents ? loggedIncidents : loggedIncidents.slice(0, 10);
  }, [loggedIncidents, showAllLoggedIncidents]);

  const visibleSignoffs = useMemo(() => {
    if (!signoffs) return null;
    return showAllSignoffs ? signoffs : signoffs.slice(0, 10);
  }, [signoffs, showAllSignoffs]);

  const visibleCleaningRuns = useMemo(() => {
    if (!cleaningRuns) return null;
    return showAllCleaningRuns ? cleaningRuns : cleaningRuns.slice(0, 10);
  }, [cleaningRuns, showAllCleaningRuns]);

  const visibleStaffReviews = useMemo(() => {
    if (!staffReviews) return null;
    return showAllStaffReviews ? staffReviews : staffReviews.slice(0, 10);
  }, [staffReviews, showAllStaffReviews]);

  const trainingMatrix = useMemo(() => {
    if (!trainingAreas) return null;

    const map = new Map<
      string,
      {
        member_id: string;
        name: string;
        byArea: Record<string, { selected: boolean; awarded_on: string | null }>;
      }
    >();

    for (const r of trainingAreas) {
      const key = r.member_id;
      if (!map.has(key)) {
        map.set(key, { member_id: r.member_id, name: r.name, byArea: {} });
      }
      const row = map.get(key)!;
      row.byArea[r.area] = { selected: r.selected, awarded_on: r.awarded_on };
    }

    const rows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [trainingAreas]);

  const hygieneDisplay = useMemo(() => {
    if (locationFilter !== "all") {
      const meta = hygieneByLocation[String(locationFilter)];
      if (!meta || meta.rating == null) {
        return { label: "—", visit: null as string | null };
      }
      return {
        label: `${meta.rating}/5`,
        visit: meta.visit_date,
      };
    }

    const metas = Object.values(hygieneByLocation);
    const rated = metas.map((m) => m.rating).filter((x): x is number => typeof x === "number");
    if (!rated.length) return { label: "—", visit: null as string | null };

    const uniq = Array.from(new Set(rated));
    if (uniq.length === 1) return { label: `${uniq[0]}/5`, visit: null as string | null };

    return { label: "Varies", visit: null as string | null };
  }, [locationFilter, hygieneByLocation]);

  const calibrationSummary = useMemo(() => {
    const list = calibrationDue ?? [];
    const overdue = list.filter((x) => x.status === "overdue").length;
    const dueSoon = list.filter((x) => x.status === "due_soon").length;
    return { overdue, dueSoon, total: list.length };
  }, [calibrationDue]);

  /* ---------- boot: org + locations + hygiene + active location ---------- */

  useEffect(() => {
    (async () => {
      try {
        setBootReady(false);

        const id = await getActiveOrgIdClient();
        setOrgId(id ?? null);
        if (!id) return;

        const { data: locData, error: locErr } = await supabase
          .from("locations")
          .select("id,name")
          .eq("org_id", id)
          .order("name");

        if (!locErr && locData) {
          setLocations(locData.map((r: any) => ({ id: String(r.id), name: r.name ?? "Unnamed" })));
        }

        try {
          const map = await fetchLatestHygieneByLocation(id);
          setHygieneByLocation(map);
        } catch {
          setHygieneByLocation({});
        }

        const activeLoc = await getActiveLocationIdClient();
        if (activeLoc) setLocationFilter(activeLoc);
      } finally {
        setBootReady(true);
      }
    })();
  }, []);

  /* ---------- runners ---------- */

  async function runRange(
    rangeFrom: string,
    rangeTo: string,
    orgIdValue: string,
    locationId: string | null,
    includeAncillary = true
  ) {
    try {
      setErr(null);
      setLoading(true);

      const [
        t,
        cleanCount,
        reviews,
        loggedInc,
        incForUnified,
        tempFails,
        so,
        cr,
        allergenEditRows,
        calTrail,
      ] = await Promise.all([
        fetchTemps(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningCount(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchStaffReviews(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchLoggedIncidentsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchIncidentsTrailAsUnifiedIncidentShape(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchTempFailuresUnified(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchSignoffsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningRunsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchAllergenChanges(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCalibrationChecksTrail(rangeFrom, rangeTo, orgIdValue, locationId),
      ]);

      setTemps(t);
      setCleaningCount(cleanCount);
      setStaffReviews(reviews);

      setLoggedIncidents(loggedInc);
      setAllergenChanges(allergenEditRows);

      setCalibrationChecks(calTrail);

      const unified: UnifiedIncidentRow[] = [
        ...(incForUnified ?? []).map((r) => ({
          id: String(r.id),
          happened_on: r.happened_on ?? null,
          created_at: r.created_at ?? null,
          type: r.type ?? "Incident",
          created_by: r.created_by ?? null,
          details: r.details ?? null,
          corrective_action: r.corrective_action ?? null,
          source: "incident" as const,
        })),
        ...(tempFails ?? []),
      ].sort((a, b) => {
        const aT = safeDate(a.created_at)?.getTime() ?? safeDate(a.happened_on)?.getTime() ?? 0;
        const bT = safeDate(b.created_at)?.getTime() ?? safeDate(b.happened_on)?.getTime() ?? 0;
        return bT - aT;
      });

      setIncidents(unified);

      setSignoffs(so);
      setCleaningRuns(cr);

      setShowAllTemps(false);
      setShowAllIncidents(false);
      setShowAllLoggedIncidents(false);
      setShowAllSignoffs(false);
      setShowAllCleaningRuns(false);
      setShowAllStaffReviews(false);

      if (locationId) {
        try {
          const hist = await fetchHygieneHistoryForLocation(orgIdValue, locationId);
          setHygieneHistory(hist);
        } catch {
          setHygieneHistory(null);
        }
      } else {
        setHygieneHistory(null);
      }

      if (includeAncillary) {
        const withinDays = 90;

        const [m, a, e, ta, calDue] = await Promise.all([
          fetchTeamDue(withinDays, orgIdValue, locationId),
          fetchAllergenLog(withinDays, orgIdValue, locationId),
          fetchEducation(orgIdValue, locationId),
          fetchTrainingAreasReport(orgIdValue, locationId),
          fetchCalibrationDue(orgIdValue, locationId),
        ]);

        setTeamDue(m);
        setAllergenLog(a);
        setEducation(e);
        setTrainingAreas(ta);
        setCalibrationDue(calDue);

        setShowAllEducation(false);
        setShowAllTrainingAreas(false);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to run report.");
      setTemps(null);
      setTeamDue(null);
      setAllergenLog(null);
      setAllergenChanges(null);
      setStaffReviews(null);
      setEducation(null);
      setTrainingAreas(null);
      setCalibrationDue(null);
      setCalibrationChecks(null);
      setCleaningCount(0);
      setIncidents(null);
      setLoggedIncidents(null);
      setSignoffs(null);
      setCleaningRuns(null);
      setHygieneHistory(null);
    } finally {
      setLoading(false);
    }
  }

  async function runCustom() {
    if (!orgId) {
      setErr("No organisation selected.");
      return;
    }
    const locId = locationFilter !== "all" ? locationFilter : null;
    await runRange(from, to, orgId, locId, true);
  }

  async function runInstantAudit90() {
    if (!orgId) {
      setErr("No organisation selected.");
      return;
    }

    const toISO = toISODate(new Date());
    const fromISO = addDaysISO(toISO, -89);

    setFrom(fromISO);
    setTo(toISO);

    const locId = locationFilter !== "all" ? locationFilter : null;
    await runRange(fromISO, toISO, orgId, locId, true);
  }

  useEffect(() => {
    if (!orgId) return;
    if (!bootReady) return;
    if (initialRunDone) return;

    (async () => {
      await runInstantAudit90();
      setInitialRunDone(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, bootReady, initialRunDone]);

  useEffect(() => {
    if (!orgId) return;
    if (!bootReady) return;
    if (!initialRunDone) return;
    if (loading) return;

    const locId = locationFilter !== "all" ? locationFilter : null;
    runRange(from, to, orgId, locId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter, orgId, bootReady, initialRunDone]);

  function downloadCSV() {
    if (!temps?.length) return;
    const blob = new Blob([tempsToCSV(temps)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instant-audit_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  function downloadFourWeekPDF() {
    const toParam = encodeURIComponent(toISODate(to));
    window.open(`/reports/four-week?to=${toParam}`, "_blank", "noopener,noreferrer");
  }

  const fourWeekTo = toISODate(to);
  const fourWeekFrom = addDaysISO(fourWeekTo, -27);

  const currentLocationLabel =
    locationFilter === "all"
      ? "All locations"
      : locations.find((l) => l.id === locationFilter)?.name ?? "This location";

  const selectedLatestRating =
    locationFilter !== "all" ? hygieneByLocation[String(locationFilter)]?.rating ?? null : null;

  const selectedLatestVisit =
    locationFilter !== "all" ? hygieneByLocation[String(locationFilter)]?.visit_date ?? null : null;

  const previousHygiene =
    locationFilter !== "all" && hygieneHistory && hygieneHistory.length > 1
      ? hygieneHistory.slice(1)
      : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      {/* Top controls */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-0 pb-3 pt-0">
          <CardTitle className="text-xl font-semibold text-slate-900">Reports</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Custom range
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900"
              />
              <span className="hidden text-slate-400 sm:inline">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900"
              />
              <Button
                onClick={runCustom}
                disabled={loading || !orgId}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Run
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-2">
            <Button
              onClick={runInstantAudit90}
              disabled={loading || !orgId}
              className="w-full rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Instant Audit (last 90 days)
            </Button>

            <Button
              variant="outline"
              onClick={downloadCSV}
              disabled={!temps?.length}
              className="w-full rounded-xl border-slate-300 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>

            <Button
              variant="outline"
              onClick={printReport}
              disabled={!temps?.length}
              className="w-full rounded-xl border-slate-300 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* Location on its own row */}
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Location
            </div>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value as "all" | string)}
            >
              <option value="all">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <div className="mt-1 text-[11px] text-slate-500">Current: {currentLocationLabel}</div>

            {/* Food hygiene rating + history */}
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Food hygiene rating
              </div>

              {locationFilter !== "all" ? (
                <>
                  <HygieneStars rating={selectedLatestRating} variant="auto" />

                  {selectedLatestVisit && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      Last inspection: {formatISOToUK(selectedLatestVisit)}
                    </div>
                  )}

                  {previousHygiene.length > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Previous ratings
                      </div>

                      <div className="mt-2 space-y-2">
                        {previousHygiene.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <HygieneStars rating={row.rating} variant="small" />
                              </div>

                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {row.visit_date
                                  ? `Inspection: ${formatISOToUK(row.visit_date)}`
                                  : "Inspection: —"}
                                {row.issuing_authority ? ` · ${row.issuing_authority}` : ""}
                              </div>

                              {row.reference && (
                                <div className="text-[11px] text-slate-500">
                                  Ref: <span className="font-mono">{row.reference}</span>
                                </div>
                              )}

                              {row.notes && (
                                <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                                  {row.notes}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 text-[11px] text-slate-500">
                              {row.certificate_expires_at
                                ? `Cert exp: ${formatISOToUK(row.certificate_expires_at)}`
                                : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : hygieneDisplay.label === "Varies" ? (
                <span className="text-sm font-medium text-slate-600">Varies by location</span>
              ) : hygieneDisplay.label === "—" ? (
                <span className="text-sm font-medium text-slate-500">No ratings</span>
              ) : (
                <HygieneStars
                  rating={Number(hygieneDisplay.label.replace("/5", "")) || null}
                  variant="auto"
                />
              )}
            </div>

            {/* Calibration due summary */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Calibration status
              </div>
              {calibrationDue == null ? (
                <div className="text-sm text-slate-500">Run a report to load calibration status.</div>
              ) : calibrationSummary.total === 0 ? (
                <div className="text-sm text-slate-500">No calibration assets configured.</div>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Total: <span className="font-semibold">{calibrationSummary.total}</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                    Due soon: <span className="font-semibold">{calibrationSummary.dueSoon}</span>
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
                    Overdue: <span className="font-semibold">{calibrationSummary.overdue}</span>
                  </span>
                </div>
              )}
              <div className="mt-2 text-[11px] text-slate-500">
                {loading ? "Loading…" : "Auto-runs when you change location."}
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              {loading ? "Loading…" : "Auto-runs when you change location."}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {err}
          </div>
        )}

        {!temps && !loading && (
          <div className="mt-3 text-xs text-slate-500">
            Run a report to see results. Instant Audit gives you a ready-for-inspection 90-day view.
          </div>
        )}
      </Card>

      {/* Printable content root */}
      <div ref={printRef} id="audit-print-root" className="space-y-6">
        {/* Four-weekly review card */}
        <Card
          data-hide-on-print
          className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">Four-Weekly Review (SFBB)</h3>
              <p className="mt-1 text-xs text-slate-500">
                Rolling 28-day compliance summary for inspectors. Period:{" "}
                <span className="font-semibold text-slate-700">
                  {formatISOToUK(fourWeekFrom)} → {formatISOToUK(fourWeekTo)}
                </span>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>• Repeat temperature failures</li>
                <li>• Missed cleaning tasks</li>
                <li>• Training drift (expired / due soon)</li>
                <li>• Calibration drift (due / overdue)</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-[260px]">
              <Button
                onClick={downloadFourWeekPDF}
                className="w-full rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Download className="mr-2 h-4 w-4" />
                Download 4-Week Audit (PDF)
              </Button>
              <div className="text-[11px] text-slate-500">
                Uses your Four-Weekly route: <span className="font-mono">/reports/four-week</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Temperature Logs */}
        {/* ... (UNCHANGED: the rest of your report cards remain as-is, except the allergen card label below) ... */}

        {/* Calibration due list */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 text-base font-semibold">Calibrations (due status)</h3>
          <p className="mb-3 text-xs text-slate-500">
            Assets are configured in <code>calibration_assets</code>. Due is calculated from the last
            check in <code>calibration_checks</code> using <code>interval_days</code>.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Interval</th>
                  <th className="py-2 pr-3">Last check</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!calibrationDue ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Run a report to load calibration status
                    </td>
                  </tr>
                ) : calibrationDue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No calibration assets configured
                    </td>
                  </tr>
                ) : (
                  calibrationDue.map((r) => {
                    const pill =
                      r.status === "overdue"
                        ? "bg-red-100 text-red-800"
                        : r.status === "due_soon"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800";

                    const label =
                      r.status === "overdue"
                        ? "Overdue"
                        : r.status === "due_soon"
                        ? "Due"
                        : r.status === "ok"
                        ? "OK"
                        : "—";

                    return (
                      <tr key={r.asset_id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-semibold">{r.asset_name}</td>
                        <td className="py-2 pr-3">{r.asset_type}</td>
                        <td className="py-2 pr-3">{r.interval_days}d</td>
                        <td className="py-2 pr-3">
                          {r.last_checked_on ? formatISOToUK(r.last_checked_on) : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          {r.next_due_on ? formatISOToUK(r.next_due_on) : "—"}
                          {r.days_until != null && (
                            <span className="ml-1 text-xs text-slate-500">({r.days_until}d)</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pill}`}>
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Calibration checks trail */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Calibration checks {calibrationChecks ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">By</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Result</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {!calibrationChecks ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : calibrationChecks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No calibration checks for this range / location
                    </td>
                  </tr>
                ) : (
                  calibrationChecks.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatISOToUK(r.checked_on)}</td>
                      <td className="py-2 pr-3 font-semibold">{r.asset_name}</td>
                      <td className="py-2 pr-3">{r.asset_type}</td>
                      <td className="py-2 pr-3">{r.staff_initials ? r.staff_initials.toUpperCase() : "—"}</td>
                      <td className="py-2 pr-3">{r.method ?? "—"}</td>
                      <td className="py-2 pr-3">{r.result ?? "—"}</td>
                      <td className="py-2 pr-3 max-w-xl">{r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Allergen review table */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 text-base font-semibold">Allergen review (schedule)</h3>
          <p className="mb-3 text-xs text-slate-500">
            Pulled from <code>allergen_review</code>. (Single schedule row; use change logs for audit history.)
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Last review</th>
                  <th className="py-2 pr-3">Interval</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Days</th>
                  <th className="py-2 pr-3">Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {!allergenLog ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : allergenLog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No allergen review schedule found
                    </td>
                  </tr>
                ) : (
                  allergenLog.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        {r.reviewed_on ? formatISOToUK(r.reviewed_on) : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.interval_days != null ? `${r.interval_days}d` : "—"}</td>
                      <td className="py-2 pr-3">{r.next_due ? formatISOToUK(r.next_due) : "—"}</td>
                      <td className="py-2 pr-3">{r.days_until ?? "—"}</td>
                      <td className="py-2 pr-3">{r.reviewer ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      {/* Allergen review table */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 text-base font-semibold">Allergen review (schedule)</h3>
          <p className="mb-3 text-xs text-slate-500">
            Pulled from <code>allergen_review</code>. (Single schedule row; use change logs for audit history.)
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Last review</th>
                  <th className="py-2 pr-3">Interval</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Days</th>
                  <th className="py-2 pr-3">Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {!allergenLog ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : allergenLog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No allergen review schedule found
                    </td>
                  </tr>
                ) : (
                  allergenLog.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">
                        {r.reviewed_on ? formatISOToUK(r.reviewed_on) : "—"}
                      </td>
                      <td className="py-2 pr-3">{r.interval_days != null ? `${r.interval_days}d` : "—"}</td>
                      <td className="py-2 pr-3">{r.next_due ? formatISOToUK(r.next_due) : "—"}</td>
                      <td className="py-2 pr-3">{r.days_until ?? "—"}</td>
                      <td className="py-2 pr-3">{r.reviewer ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Allergen edits table remains unchanged below */}
        {/* ...your existing allergen_change_logs table... */}
      </div>

      <style jsx global>{`
        @media print {
          nav,
          header,
          footer,
          [data-hide-on-print],
          button {
            display: none !important;
          }

          [data-compliance-indicator],
          #tt-compliance-indicator,
          .tt-compliance-indicator,
          [data-fab],
          #tt-fab,
          .tt-fab {
            display: none !important;
            visibility: hidden !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          a {
            text-decoration: none;
            color: inherit;
          }
          body {
            background: white !important;
          }
          .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
