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
  days_until?: number | null;
};

type StaffReviewRow = {
  id: string;
  review_date: string; // ISO yyyy-mm-dd
  created_at: string | null; // ISO datetime
  staff_name: string;
  staff_initials: string | null;
  location_name: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  category: string;
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

type IncidentRow = {
  id: string;
  happened_on: string | null; // yyyy-mm-dd
  type: string | null;
  details: string | null;
  corrective_action: string | null;
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

// dd-mm-yyyy
function formatISOToUK(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTimeHM(iso: string | null | undefined): string {
  const d = safeDate(iso);
  if (!d) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function addDaysISO(ymd: string, days: number) {
  const d = safeDate(ymd) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
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

function normaliseTrainingAreas(
  val: TrainingAreasValue
): Record<string, { awarded_on?: string; expires_on?: string }> {
  const out: Record<string, { awarded_on?: string; expires_on?: string }> = {};

  if (!val) return out;

  // Array<string>
  if (Array.isArray(val) && val.every((x) => typeof x === "string")) {
    for (const area of val as string[]) out[String(area)] = {};
    return out;
  }

  // Array<object>
  if (Array.isArray(val)) {
    for (const item of val as any[]) {
      const area = String(item?.area ?? item?.name ?? "").trim();
      if (!area) continue;

      const awarded = item?.awarded_on ?? item?.added_on ?? null;
      const expires = item?.expires_on ?? null;

      out[area] = {
        awarded_on: awarded ? toISODate(awarded) : undefined,
        expires_on: expires ? toISODate(expires) : undefined,
      };
    }
    return out;
  }

  // Object map
  if (typeof val === "object") {
    for (const [area, meta] of Object.entries(val as Record<string, any>)) {
      const awarded = meta?.awarded_on ?? meta?.added_on ?? null;
      const expires = meta?.expires_on ?? null;
      out[String(area)] = {
        awarded_on: awarded ? toISODate(awarded) : undefined,
        expires_on: expires ? toISODate(expires) : undefined,
      };
    }
    return out;
  }

  return out;
}

function computeTrainingStatus(awardedISO: string | null, expiresISO: string | null) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  const awarded = safeDate(awardedISO);
  const expires = safeDate(expiresISO);

  // If awarded exists but expires doesn't, default to 12 months (365 days).
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

async function fetchTrainingAreasReport(orgId: string): Promise<TrainingAreaRow[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id,name,initials,email,active,training_areas")
    .eq("org_id", orgId)
    .order("name", { ascending: true })
    .limit(5000);

  if (error) throw error;

  const rows: TrainingAreaRow[] = [];

  for (const m of (data ?? []) as any[]) {
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

async function fetchIncidentsTrail(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<IncidentRow[]> {
  try {
    let q = supabase
      .from("cleaning_incidents")
      .select(
        "id,happened_on,type,details,corrective_action,preventive_action,created_by,created_at,location_id"
      )
      .eq("org_id", orgId)
      .gte("happened_on", fromISO)
      .lte("happened_on", toISO)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3000);

    if (locationId) q = q.eq("location_id", locationId);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      happened_on: r.happened_on ? String(r.happened_on) : null,
      type: r.type ? String(r.type) : null,
      details: r.details ? String(r.details) : null,
      corrective_action: r.corrective_action ? String(r.corrective_action) : null,
      preventive_action: r.preventive_action ? String(r.preventive_action) : null,
      created_by: r.created_by ? String(r.created_by) : null,
      created_at: r.created_at ? String(r.created_at) : null,
    }));
  } catch {
    let q2 = supabase
      .from("incidents")
      .select("id,happened_on,type,details,corrective_action,created_by,created_at,location_id")
      .eq("org_id", orgId)
      .gte("happened_on", fromISO)
      .lte("happened_on", toISO)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3000);

    if (locationId) q2 = q2.eq("location_id", locationId);

    const { data, error } = await q2;
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      happened_on: r.happened_on ? String(r.happened_on) : null,
      type: r.type ? String(r.type) : null,
      details: r.details ? String(r.details) : null,
      corrective_action: r.corrective_action ? String(r.corrective_action) : null,
      preventive_action: null,
      created_by: r.created_by ? String(r.created_by) : null,
      created_at: r.created_at ? String(r.created_at) : null,
    }));
  }
}

/**
 * NOTE: left untouched (this still uses trainings/staff as in your existing file).
 * If you've removed staff table, we should refactor these joins next.
 */
async function fetchTeamDue(withinDays: number, orgId: string): Promise<TeamRow[]> {
  const { data: tData, error: tErr } = await supabase
    .from("trainings")
    .select("id, staff_id, expires_on")
    .eq("org_id", orgId);
  if (tErr) throw tErr;

  const trainings = (tData ?? []).filter((t: any) => !!t.expires_on);
  if (!trainings.length) return [];

  const staffIds = Array.from(
    new Set(
      trainings
        .map((t: any) => t.staff_id)
        .filter((id: any) => typeof id === "string" || typeof id === "number")
        .map((id: any) => String(id))
    )
  );

  const staffMap = new Map<string, { name: string; email: string | null; initials: string | null }>();

  if (staffIds.length) {
    const { data: sData, error: sErr } = await supabase
      .from("staff")
      .select("id, name, email, initials")
      .in("id", staffIds);
    if (sErr) throw sErr;

    for (const s of sData ?? []) {
      staffMap.set(String(s.id), {
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
      const staff = staffMap.get(String(r.staff_id)) ?? { name: "—", email: null, initials: null };

      const exp = safeDate(r.expires_on);
      if (!exp) return null;

      const exp0 = new Date(exp);
      exp0.setHours(0, 0, 0, 0);

      const days_until = Math.round((exp0.getTime() - today0.getTime()) / 86400000);

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
    .filter((r: { days_until: number | null }) => r.days_until != null && r.days_until <= withinDays)
    .sort((a: any, b: any) => (a.expires_on || "").localeCompare(b.expires_on || ""));
}

async function fetchAllergenLog(withinDays: number, orgId: string): Promise<AllergenRow[]> {
  const { data, error } = await supabase
    .from("allergen_review_log")
    .select("id, reviewed_on, interval_days, reviewer_name")
    .eq("org_id", orgId)
    .order("reviewed_on", { ascending: false })
    .limit(365);

  if (error) throw error;

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? [])
    .map((r: any) => {
      const reviewed = safeDate(r.reviewed_on);
      const intervalDays = Number(r.interval_days ?? 0);

      let nextDue: Date | null = null;
      if (reviewed && Number.isFinite(intervalDays) && intervalDays > 0) {
        nextDue = new Date(reviewed.getTime() + intervalDays * 86400000);
      }

      const next0 = nextDue ? new Date(nextDue) : null;
      if (next0) next0.setHours(0, 0, 0, 0);

      const days_until = next0 ? Math.round((next0.getTime() - today0.getTime()) / 86400000) : null;

      return {
        id: String(r.id),
        reviewed_on: reviewed ? reviewed.toISOString() : null,
        next_due: nextDue ? nextDue.toISOString() : null,
        reviewer: r.reviewer_name ?? null,
        days_until,
      } as AllergenRow;
    })
    .filter((r: any) => r.days_until != null && r.days_until <= withinDays)
    .sort((a: any, b: any) => (a.next_due || "").localeCompare(b.next_due || ""));
}

async function fetchStaffReviews(
  fromISO: string,
  toISO: string,
  orgId: string,
  locationId: string | null
): Promise<StaffReviewRow[]> {
  let query = supabase
    .from("staff_reviews")
    .select(
      `
      id,
      review_date,
      created_at,
      category,
      rating,
      notes,
      reviewer_name,
      reviewer_email,
      staff:staff_id ( name, initials ),
      location:location_id ( name )
    `
    )
    .eq("org_id", orgId)
    .gte("review_date", fromISO)
    .lte("review_date", toISO)
    .order("review_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    review_date: toISODate(r.review_date),
    created_at: r.created_at ?? null,
    staff_name: r.staff?.name ?? "—",
    staff_initials: r.staff?.initials ?? null,
    location_name: r.location?.name ?? null,
    reviewer_name: r.reviewer_name ?? null,
    reviewer_email: r.reviewer_email ?? null,
    category: r.category ?? "—",
    rating: Number(r.rating ?? 0),
    notes: r.notes ?? null,
  }));
}

async function fetchEducation(orgId: string): Promise<EducationRow[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select(
      `
      id,
      type,
      awarded_on,
      expires_on,
      certificate_url,
      notes,
      staff:staff_id ( name, email, initials )
    `
    )
    .eq("org_id", orgId)
    .order("expires_on", { ascending: true })
    .order("awarded_on", { ascending: true });

  if (error) throw error;

  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);

  return (data ?? []).map((r: any) => {
    const staff = r.staff ?? {};
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
      staff_name: staff.name ?? "—",
      staff_initials: staff.initials ?? null,
      staff_email: staff.email ?? null,
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

  const [temps, setTemps] = useState<TempRow[] | null>(null);
  const [teamDue, setTeamDue] = useState<TeamRow[] | null>(null);
  const [allergenLog, setAllergenLog] = useState<AllergenRow[] | null>(null);
  const [staffReviews, setStaffReviews] = useState<StaffReviewRow[] | null>(null);
  const [education, setEducation] = useState<EducationRow[] | null>(null);
  const [cleaningCount, setCleaningCount] = useState(0);

  const [incidents, setIncidents] = useState<IncidentRow[] | null>(null);
  const [signoffs, setSignoffs] = useState<SignoffRow[] | null>(null);
  const [cleaningRuns, setCleaningRuns] = useState<CleaningRunRow[] | null>(null);

  // Training pills report source rows
  const [trainingAreas, setTrainingAreas] = useState<TrainingAreaRow[] | null>(null);
  const [showAllTrainingAreas, setShowAllTrainingAreas] = useState(false);

  const [showAllTemps, setShowAllTemps] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [showAllSignoffs, setShowAllSignoffs] = useState(false);
  const [showAllCleaningRuns, setShowAllCleaningRuns] = useState(false);

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

  const visibleSignoffs = useMemo(() => {
    if (!signoffs) return null;
    return showAllSignoffs ? signoffs : signoffs.slice(0, 10);
  }, [signoffs, showAllSignoffs]);

  const visibleCleaningRuns = useMemo(() => {
    if (!cleaningRuns) return null;
    return showAllCleaningRuns ? cleaningRuns : cleaningRuns.slice(0, 10);
  }, [cleaningRuns, showAllCleaningRuns]);

  // ✅ pivot trainingAreas into a per-person matrix
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

  const visibleTrainingMatrix = useMemo(() => {
    if (!trainingMatrix) return null;
    return showAllTrainingAreas ? trainingMatrix : trainingMatrix.slice(0, 12);
  }, [trainingMatrix, showAllTrainingAreas]);

  /* ---------- boot: org + locations ---------- */

  useEffect(() => {
    (async () => {
      const id = await getActiveOrgIdClient();
      setOrgId(id ?? null);
      if (!id) return;

      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("org_id", id)
        .order("name");

      if (!error && data) {
        setLocations(data.map((r: any) => ({ id: String(r.id), name: r.name ?? "Unnamed" })));
      }

      const activeLoc = await getActiveLocationIdClient();
      if (activeLoc) setLocationFilter(activeLoc);
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

      const [t, cleanCount, reviews, inc, so, cr] = await Promise.all([
        fetchTemps(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningCount(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchStaffReviews(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchIncidentsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchSignoffsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
        fetchCleaningRunsTrail(rangeFrom, rangeTo, orgIdValue, locationId),
      ]);

      setTemps(t);
      setCleaningCount(cleanCount);
      setStaffReviews(reviews);
      setIncidents(inc);
      setSignoffs(so);
      setCleaningRuns(cr);

      setShowAllTemps(false);
      setShowAllIncidents(false);
      setShowAllSignoffs(false);
      setShowAllCleaningRuns(false);

      if (includeAncillary) {
        const withinDays = 90;
        const [m, a, e, ta] = await Promise.all([
          fetchTeamDue(withinDays, orgIdValue),
          fetchAllergenLog(withinDays, orgIdValue),
          fetchEducation(orgIdValue),
          fetchTrainingAreasReport(orgIdValue),
        ]);

        setTeamDue(m);
        setAllergenLog(a);
        setEducation(e);
        setTrainingAreas(ta);

        setShowAllEducation(false);
        setShowAllTrainingAreas(false);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to run report.");
      setTemps(null);
      setTeamDue(null);
      setAllergenLog(null);
      setStaffReviews(null);
      setEducation(null);
      setTrainingAreas(null);
      setCleaningCount(0);
      setIncidents(null);
      setSignoffs(null);
      setCleaningRuns(null);
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
    if (orgId && !initialRunDone) {
      runInstantAudit90();
      setInitialRunDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

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

  // ✅ NEW: Four-week review download
  function downloadFourWeekPDF() {
    // Route lives at /reports/four-week (protected), accepts ?to=YYYY-MM-DD
    const toParam = encodeURIComponent(toISODate(to));
    window.open(`/reports/four-week?to=${toParam}`, "_blank", "noopener,noreferrer");
  }

  const fourWeekTo = toISODate(to);
  const fourWeekFrom = addDaysISO(fourWeekTo, -27);

  const currentLocationLabel =
    locationFilter === "all"
      ? "All locations"
      : locations.find((l) => l.id === locationFilter)?.name ?? "This location";

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      {/* Top controls */}
      <Card className="border-none bg-transparent p-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between px-0 pb-3 pt-0">
          <CardTitle className="text-xl font-semibold text-slate-900">Reports</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Custom range</div>

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
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Location</div>
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
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {err}
          </div>
        )}

        {!temps && !loading && (
          <div className="mt-3 text-xs text-slate-500">
            Run a report to see results. (Instant Audit defaults to 90 days, which is your inspection-ready view.)
          </div>
        )}
      </Card>

      {/* Printable content root */}
      <div ref={printRef} id="audit-print-root" className="space-y-6">
        {/* ✅ NEW: Four-weekly review card */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
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
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-[260px]" data-hide-on-print>
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

        {/* Temps table */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Temperature Logs {temps ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Temp (°C)</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!temps ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : temps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No results for this range / location
                    </td>
                  </tr>
                ) : (
                  visibleTemps!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{formatISOToUK(r.date)}</td>
                      <td className="py-2 pr-3">{r.staff}</td>
                      <td className="py-2 pr-3">{r.location}</td>
                      <td className="py-2 pr-3">{r.item}</td>
                      <td className="py-2 pr-3">{r.temp_c ?? "—"}</td>
                      <td className="py-2 pr-3">{r.target_key ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.status ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {r.status}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {temps && temps.length > 10 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllTemps ? temps.length : Math.min(10, temps.length)} of {temps.length} entries
              </div>
              <button
                type="button"
                onClick={() => setShowAllTemps((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllTemps ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* ✅ MERGED: Training + Education in one card */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          {/* Training matrix */}
          <h3 className="mb-1 text-base font-semibold">Training</h3>
          <p className="mb-3 text-xs text-slate-500">
            Areas pulled from team_members.training_areas. If an awarded date exists, it’s shown under the tick.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Staff</th>
                  {SFBB_AREAS.map((a) => (
                    <th key={a} className="py-2 pr-4 whitespace-nowrap">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!trainingMatrix ? (
                  <tr>
                    <td colSpan={1 + SFBB_AREAS.length} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : trainingMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={1 + SFBB_AREAS.length} className="py-6 text-center text-slate-500">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  visibleTrainingMatrix!.map((row) => (
                    <tr key={row.member_id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium">{row.name}</td>

                      {SFBB_AREAS.map((area) => {
                        const cell = row.byArea[String(area)];
                        const has = !!cell?.selected;

                        return (
                          <td key={String(area)} className="py-2 pr-4 align-top">
                            {has ? (
                              <div className="leading-tight">
                                <div className="text-base font-semibold text-emerald-700">✓</div>
                                <div className="text-[11px] text-slate-500">
                                  {cell.awarded_on ? formatISOToUK(cell.awarded_on) : "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {trainingMatrix && trainingMatrix.length > 12 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllTrainingAreas ? trainingMatrix.length : Math.min(12, trainingMatrix.length)} of{" "}
                {trainingMatrix.length} staff
              </div>
              <button
                type="button"
                onClick={() => setShowAllTrainingAreas((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllTrainingAreas ? "Show first 12" : "View all"}
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="my-6 border-t border-slate-200" />

          {/* Education table */}
          <h3 className="mb-3 text-base font-semibold">Staff Education / Qualifications</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Initials</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Awarded</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3">Days</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2 pr-3">Certificate</th>
                </tr>
              </thead>

              <tbody>
                {!education?.length ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-500">
                      No education / training records for this organisation.
                    </td>
                  </tr>
                ) : (
                  visibleEducation!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{r.staff_name}</td>
                      <td className="py-2 pr-3">{r.staff_initials ?? "—"}</td>
                      <td className="py-2 pr-3">{r.staff_email ?? "—"}</td>
                      <td className="py-2 pr-3">{r.type ?? "—"}</td>
                      <td className="py-2 pr-3">{r.awarded_on ? formatISOToUK(r.awarded_on) : "—"}</td>
                      <td className="py-2 pr-3">{r.expires_on ? formatISOToUK(r.expires_on) : "—"}</td>
                      <td className={`py-2 pr-3 ${r.days_until != null && r.days_until < 0 ? "text-red-700" : ""}`}>
                        {r.days_until != null ? r.days_until : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.status === "no-expiry" ? "No expiry" : r.status === "expired" ? "Expired" : "Valid"}
                      </td>
                      <td className="max-w-xs py-2 pr-3">
                        {r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.certificate_url ? (
                          <a
                            href={r.certificate_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-sky-700 underline"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {education && education.length > 10 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllEducation ? education.length : Math.min(10, education.length)} of {education.length} records
              </div>
              <button
                type="button"
                onClick={() => setShowAllEducation((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllEducation ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* Cleaning rota submissions trail */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Cleaning rota submissions {cleaningRuns ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>

          <div className="mb-2 text-xs text-slate-500">
            Recorded from cleaning_task_runs. Shows category + task, who did it, and timestamp.
            <span className="ml-2 font-semibold text-slate-700">Total logged: {cleaningCount}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3">By</th>
                </tr>
              </thead>
              <tbody>
                {!cleaningRuns ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : cleaningRuns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No cleaning submissions for this range / location
                    </td>
                  </tr>
                ) : (
                  visibleCleaningRuns!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{formatISOToUK(r.run_on)}</td>
                      <td className="py-2 pr-3">{formatTimeHM(r.done_at)}</td>
                      <td className="py-2 pr-3 font-semibold">{r.category}</td>
                      <td className="py-2 pr-3">{r.task}</td>
                      <td className="py-2 pr-3">{r.done_by ? r.done_by.toUpperCase() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {cleaningRuns && cleaningRuns.length > 10 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllCleaningRuns ? cleaningRuns.length : Math.min(10, cleaningRuns.length)} of{" "}
                {cleaningRuns.length} entries
              </div>
              <button
                type="button"
                onClick={() => setShowAllCleaningRuns((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllCleaningRuns ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* Incidents */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Incidents & corrective actions {incidents ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">By</th>
                  <th className="py-2 pr-3">Details</th>
                  <th className="py-2 pr-3">Corrective</th>
                </tr>
              </thead>
              <tbody>
                {!incidents ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : incidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No incidents for this range / location
                    </td>
                  </tr>
                ) : (
                  visibleIncidents!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{r.happened_on ? formatISOToUK(r.happened_on) : "—"}</td>
                      <td className="py-2 pr-3">{formatTimeHM(r.created_at)}</td>
                      <td className="py-2 pr-3 font-semibold">{r.type ?? "Incident"}</td>
                      <td className="py-2 pr-3">{r.created_by ? r.created_by.toUpperCase() : "—"}</td>
                      <td className="py-2 pr-3 max-w-xs">{r.details ? <span className="line-clamp-2">{r.details}</span> : "—"}</td>
                      <td className="py-2 pr-3 max-w-xs">
                        {r.corrective_action ? <span className="line-clamp-2">{r.corrective_action}</span> : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {incidents && incidents.length > 10 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllIncidents ? incidents.length : Math.min(10, incidents.length)} of {incidents.length} entries
              </div>
              <button
                type="button"
                onClick={() => setShowAllIncidents((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllIncidents ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* Day sign-offs */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">
            Day sign-offs {signoffs ? `(${formatISOToUK(from)} → ${formatISOToUK(to)})` : ""}
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Signed by</th>
                  <th className="py-2 pr-3">Notes / corrective actions</th>
                </tr>
              </thead>
              <tbody>
                {!signoffs ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Run a report to see results
                    </td>
                  </tr>
                ) : signoffs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No sign-offs for this range / location
                    </td>
                  </tr>
                ) : (
                  visibleSignoffs!.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{formatISOToUK(r.signoff_on)}</td>
                      <td className="py-2 pr-3">{formatTimeHM(r.created_at)}</td>
                      <td className="py-2 pr-3 font-semibold">{r.signed_by ? r.signed_by.toUpperCase() : "—"}</td>
                      <td className="py-2 pr-3 max-w-xl">{r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {signoffs && signoffs.length > 10 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600" data-hide-on-print>
              <div>
                Showing {showAllSignoffs ? signoffs.length : Math.min(10, signoffs.length)} of {signoffs.length} entries
              </div>
              <button
                type="button"
                onClick={() => setShowAllSignoffs((v) => !v)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                {showAllSignoffs ? "Show first 10" : "View all"}
              </button>
            </div>
          )}
        </Card>

        {/* Allergen log */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-3 text-base font-semibold">Allergen Register — reviews due/overdue (≤90 days)</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Reviewed on</th>
                  <th className="py-2 pr-3">Reviewer</th>
                  <th className="py-2 pr-3">Next due</th>
                  <th className="py-2 pr-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {!allergenLog?.length ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      None due
                    </td>
                  </tr>
                ) : (
                  allergenLog.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{r.reviewed_on ? formatISOToUK(r.reviewed_on) : "—"}</td>
                      <td className="py-2 pr-3">{r.reviewer ?? "—"}</td>
                      <td className="py-2 pr-3">{r.next_due ? formatISOToUK(r.next_due) : "—"}</td>
                      <td className={`py-2 pr-3 ${r.days_until != null && r.days_until < 0 ? "text-red-700" : ""}`}>
                        {r.days_until != null ? r.days_until : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Staff reviews */}
        <Card className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-900 shadow-sm backdrop-blur-sm">
          <h3 className="mb-1 text-base font-semibold">Manager / Supervisor QC Reviews</h3>
          <p className="mb-3 text-xs text-slate-500">
            Logged from the Manager Dashboard QC review form. Shows who was reviewed, who reviewed them, and the rating and notes.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Reviewer</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {!staffReviews?.length ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No manager reviews for this range / location
                    </td>
                  </tr>
                ) : (
                  staffReviews.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{formatISOToUK(r.review_date)}</td>
                      <td className="py-2 pr-3">{formatTimeHM(r.created_at)}</td>
                      <td className="py-2 pr-3">
                        {r.staff_name}
                        {r.staff_initials ? ` (${r.staff_initials})` : ""}
                      </td>
                      <td className="py-2 pr-3">{r.location_name ?? "—"}</td>
                      <td className="py-2 pr-3">{r.reviewer_name || r.reviewer_email || "—"}</td>
                      <td className="py-2 pr-3">{r.category}</td>
                      <td className="py-2 pr-3">{r.rating}</td>
                      <td className="max-w-xs py-2 pr-3">{r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
