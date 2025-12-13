// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/* ---------- Types ---------- */

type LocationOption = { id: string; name: string };

type StaffOption = { id: string; name: string; initials: string | null };

type ReviewSummary = { last7: number; last30: number; staffWithReviews: number };
type TempSummary = { today: number; fails7d: number };
type TrainingSummary = { loggedToday: number; overdue: number };
type CleaningSummary = { loggedToday: number };

type ReviewFormState = {
  staff_id: string;
  category: string;
  rating: number;
  notes: string;
};

type TodayTempRow = {
  id: string;
  time: string;
  staff: string;
  item: string;
  area: string;
  temp_c: number | null;
  status: string | null;
};

type TodayCleaningRow = {
  id: string;
  time: string | null;
  routine: string;
  staff: string | null;
  notes: string | null;
};

type EducationRow = {
  id: string;
  staffId: string | null;
  staffName: string;
  staffInitials: string | null;
  type: string | null;
  awardedOn: string | null;
  expiresOn: string | null;
  daysOverdue: number | null;
};

type FoodHygieneStatus = {
  lastInspectedOn: string | null;
  rating: number | null;
  nextDueOn: string | null;
  daysToDue: number | null;
  overdue: boolean;
  dueSoon: boolean;
};

type ManagerSignoffRow = {
  id: string;
  org_id: string;
  location_id: string;
  signed_on: string; // yyyy-mm-dd
  signed_at: string; // timestamptz
  manager_initials: string;
  notes: string | null;
  temp_logs_today: number;
  temp_fails_7d: number;
  cleaning_logged_today: number;
  training_overdue: number;
  qc_reviews_7d: number;
  qc_reviews_30d: number;
  staff_reviewed_30d: number;
};

const CATEGORY_OPTIONS = ["Temps", "Cleaning", "Allergens", "General"];

/* ---------- Helpers ---------- */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January","February","March","April","May","June","July","August","September","October","November","December",
];

function formatPrettyDate(d: Date) {
  const wd = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${wd} ${day} ${month} ${year}`;
}

function formatTimeHM(d: Date | null | undefined): string | null {
  if (!d) return null;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatISOToUK(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

/* ---------- KPI Tile ---------- */

const KPI_HEIGHT = "min-h-[120px]";

function KpiTile({
  title,
  value,
  sub,
  tone,
  icon,
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  tone: "neutral" | "ok" | "warn" | "danger";
  icon?: string;
  onClick?: () => void;
}) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50/90"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/90"
      : tone === "ok"
      ? "border-emerald-200 bg-emerald-50/90"
      : "border-slate-200 bg-white/90";

  const accentCls =
    tone === "danger"
      ? "bg-red-400"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "ok"
      ? "bg-emerald-400"
      : "bg-slate-300";

  const Inner = (
    <motion.div
      whileHover={{ y: -3 }}
      className={cls(
        "relative rounded-2xl border p-4 shadow-sm overflow-hidden",
        "flex flex-col",
        KPI_HEIGHT,
        toneCls
      )}
    >
      <div className={cls("absolute left-0 top-3 bottom-3 w-1.5 rounded-full opacity-80", accentCls)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-700/90">
            {title}
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 leading-none">
            {value}
          </div>
        </div>
        {icon ? (
          <div className="shrink-0 text-lg opacity-90" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-auto pt-3 text-[11px] font-medium text-slate-600">{sub}</div>
    </motion.div>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="w-full text-left">
      {Inner}
    </button>
  ) : (
    Inner
  );
}

/* ===================================================================== */

const LS_LAST_INITIALS = "tt_last_initials"; // reuse existing convention

export default function ManagerDashboardPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [tempsSummary, setTempsSummary] = useState<TempSummary | null>(null);
  const [trainingSummary, setTrainingSummary] = useState<TrainingSummary | null>(null);
  const [cleaningSummary, setCleaningSummary] = useState<CleaningSummary | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

  const [todayTemps, setTodayTemps] = useState<TodayTempRow[]>([]);
  const [todayCleaningRuns, setTodayCleaningRuns] = useState<TodayCleaningRow[]>([]);

  const [educationDue, setEducationDue] = useState<EducationRow[]>([]);
  const [foodHygiene, setFoodHygiene] = useState<FoodHygieneStatus | null>(null);

  const [loadingCards, setLoadingCards] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({
    staff_id: "",
    category: CATEGORY_OPTIONS[0],
    rating: 5,
    notes: "",
  });

  // Education modal
  const [educationModalOpen, setEducationModalOpen] = useState(false);

  // Sign-off
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffInitials, setSignoffInitials] = useState<string>("");
  const [signoffNotes, setSignoffNotes] = useState<string>("");
  const [savingSignoff, setSavingSignoff] = useState(false);
  const [lastSignoffToday, setLastSignoffToday] = useState<ManagerSignoffRow | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  /* ---------- Boot: org + location ---------- */

  useEffect(() => {
    (async () => {
      const oId = await getActiveOrgIdClient();
      setOrgId(oId ?? null);
      if (!oId) return;

      setLocationLoading(true);
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id,name")
          .eq("org_id", oId)
          .order("name");

        if (error) throw error;

        const locs =
          data?.map((r: any) => ({
            id: String(r.id),
            name: r.name ?? "Unnamed",
          })) ?? [];

        setLocations(locs);

        const activeLoc = await getActiveLocationIdClient();
        if (activeLoc) setLocationId(activeLoc);
        else if (locs[0]) setLocationId(locs[0].id);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Failed to load locations.");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  /* ---------- Load initials default ---------- */

  useEffect(() => {
    try {
      const ini = (localStorage.getItem(LS_LAST_INITIALS) ?? "").toUpperCase().trim();
      setSignoffInitials(ini);
    } catch {
      setSignoffInitials("");
    }
  }, []);

  /* ---------- Load staff list for QC reviews ---------- */

  useEffect(() => {
    if (!orgId) return;

    (async () => {
      try {
        setStaffLoading(true);
        const { data, error } = await supabase
          .from("staff")
          .select("id, name, initials, active, email")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("name");

        if (error) throw error;

        const staffList: StaffOption[] =
          data?.map((r: any) => ({
            id: String(r.id),
            name: r.name ?? r.email ?? "Unnamed",
            initials: r.initials ?? null,
          })) ?? [];

        setStaffOptions(staffList);

        setReviewForm((prev) => {
          if (!prev.staff_id || !staffList.some((s) => s.id === prev.staff_id)) {
            return { ...prev, staff_id: "" };
          }
          return prev;
        });
      } catch (e: any) {
        console.error(e);
      } finally {
        setStaffLoading(false);
      }
    })();
  }, [orgId]);

  /* ---------- Sign-off loader ---------- */

  async function loadTodaySignoff(oId: string, locId: string) {
    try {
      const { data, error } = await supabase
        .from("manager_signoffs")
        .select("*")
        .eq("org_id", oId)
        .eq("location_id", locId)
        .eq("signed_on", todayISO)
        .order("signed_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      setLastSignoffToday((data?.[0] as any) ?? null);
    } catch (e) {
      // If table not created / RLS blocks, don’t hard-fail the whole page
      console.warn("Signoff load failed", e);
      setLastSignoffToday(null);
    }
  }

  /* ---------- Refresh dashboard cards + activity lists ---------- */

  async function refreshCards() {
    if (!orgId || !locationId) {
      setErr("No location selected.");
      return;
    }

    setLoadingCards(true);
    setErr(null);

    try {
      const sevenDaysAgoISO = new Date(today.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      const thirtyDaysAgoISO = new Date(today.getTime() - 30 * 24 * 3600 * 1000).toISOString();

      const dateStartToday = new Date(todayISO);
      const dateEndToday = new Date(dateStartToday);
      dateEndToday.setDate(dateEndToday.getDate() + 1);

      const [
        tempsRes,
        failsRes,
        trainingRes,
        cleaningRes,
        reviewsRes,
        tempsListRes,
        cleaningListRes,
      ] = await Promise.all([
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString()),

        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", sevenDaysAgoISO),

        supabase
          .from("trainings")
          .select("id, staff_id, type, awarded_on, expires_on, created_at")
          .eq("org_id", orgId),

        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("done_at", dateStartToday.toISOString())
          .lt("done_at", dateEndToday.toISOString()),

        supabase
          .from("staff_reviews")
          .select("id, staff_id, review_date", { count: "exact", head: false })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("review_date", thirtyDaysAgoISO.slice(0, 10)),

        supabase
          .from("food_temp_logs")
          .select("*")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        supabase
          .from("cleaning_task_runs")
          .select("*")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("done_at", dateStartToday.toISOString())
          .lt("done_at", dateEndToday.toISOString())
          .order("done_at", { ascending: false })
          .limit(200),
      ]);

      setTempsSummary({ today: tempsRes.count ?? 0, fails7d: failsRes.count ?? 0 });

      /* ---- Training summary + educationDue ---- */
      const trainingRows: any[] = (trainingRes.data as any[]) ?? [];
      const today0 = new Date(todayISO);
      today0.setHours(0, 0, 0, 0);

      const staffIds = Array.from(
        new Set(
          trainingRows
            .map((t) => t.staff_id)
            .filter((id) => id != null)
            .map((id) => String(id))
        )
      );

      const staffMap = new Map<string, { name: string; initials: string | null }>();

      if (staffIds.length) {
        const { data: staffData } = await supabase.from("staff").select("id, name, initials").in("id", staffIds);
        for (const s of staffData ?? []) {
          staffMap.set(String(s.id), { name: s.name ?? "Unknown", initials: s.initials ?? null });
        }
      }

      const loggedToday = trainingRows.filter((t) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d.toISOString().slice(0, 10) === todayISO;
      }).length;

      const overdueRows: EducationRow[] = trainingRows
        .filter((t) => t.expires_on)
        .map((t) => {
          const staff = staffMap.get(String(t.staff_id));
          const exp = new Date(t.expires_on);
          exp.setHours(0, 0, 0, 0);

          const daysOver = Math.round((today0.getTime() - exp.getTime()) / 86400000) || 0;

          return {
            id: String(t.id),
            staffId: t.staff_id ? String(t.staff_id) : null,
            staffName: staff?.name ?? "Unknown",
            staffInitials: staff?.initials ?? null,
            type: t.type ?? null,
            awardedOn: t.awarded_on ? new Date(t.awarded_on).toISOString().slice(0, 10) : null,
            expiresOn: exp.toISOString().slice(0, 10),
            daysOverdue: daysOver > 0 ? daysOver : null,
          } as EducationRow;
        })
        .filter((r) => r.daysOverdue != null && r.daysOverdue > 0)
        .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

      setTrainingSummary({ loggedToday, overdue: overdueRows.length });
      setEducationDue(overdueRows);

      setCleaningSummary({ loggedToday: cleaningRes.count ?? 0 });

      /* ---- Reviews summary ---- */
      const reviewRows: any[] = (reviewsRes.data as any[]) ?? [];
      const last7 = reviewRows.filter((r) => r.review_date && r.review_date >= sevenDaysAgoISO.slice(0, 10)).length;
      const last30 = reviewRows.length;
      const staffSet = new Set(reviewRows.map((r) => (r.staff_id ? String(r.staff_id) : "")));
      staffSet.delete("");

      setReviewSummary({ last7, last30, staffWithReviews: staffSet.size });

      /* ---- Today’s temp logs list ---- */
      const tempsData: any[] = (tempsListRes.data as any[]) ?? [];
      setTodayTemps(
        tempsData.map((r) => {
          const ts = r.created_at || r.at ? new Date(r.created_at ?? r.at) : null;
          return {
            id: String(r.id),
            time: formatTimeHM(ts) ?? "—",
            staff: r.staff_initials ?? r.initials ?? "—",
            item: r.note ?? "—",
            area: r.area ?? "—",
            temp_c: r.temp_c != null ? Number(r.temp_c) : null,
            status: r.status ?? null,
          };
        })
      );

      /* ---- Today’s cleaning runs list ---- */
      const cleaningData: any[] = (cleaningListRes.data as any[]) ?? [];
      setTodayCleaningRuns(
        cleaningData.map((r) => {
          const doneAt: Date | null = r.done_at ? new Date(r.done_at) : r.created_at ? new Date(r.created_at) : null;
          const routineName = r.routine_name || r.routine || r.name || "Cleaning routine";
          const staffNameOrInitials =
            r.completed_by_initials || r.staff_initials || r.initials || r.completed_by || r.done_by || null;
          const notesVal = r.notes || r.comment || null;

          return {
            id: String(r.id),
            time: formatTimeHM(doneAt),
            routine: routineName,
            staff: staffNameOrInitials,
            notes: notesVal,
          };
        })
      );

      /* ---- Food hygiene rating / reminder (18-month cycle) ---- */
      try {
        const todayZero = new Date(todayISO);
        todayZero.setHours(0, 0, 0, 0);

        type HygieneRow = {
          inspected_on?: string | null;
          inspection_date?: string | null;
          visit_date?: string | null;
          rating?: any;
          location_id?: string | null;
          created_at?: string | null;
        };

        let chosen: HygieneRow | null = null;

        const { data: inspRows } = await supabase
          .from("food_hygiene_inspections")
          .select("inspected_on, inspection_date, rating, location_id, created_at")
          .eq("org_id", orgId)
          .order("inspected_on", { ascending: false })
          .order("inspection_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        const allInsp = (inspRows ?? []) as HygieneRow[];
        if (allInsp.length) {
          chosen = locationId
            ? allInsp.find((r) => r.location_id === locationId) ?? allInsp[0]
            : allInsp[0];
        }

        if (!chosen) {
          const { data: ratingRows } = await supabase
            .from("food_hygiene_ratings")
            .select("visit_date, rating, location_id, created_at")
            .eq("org_id", orgId)
            .order("visit_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(50);

          const allRatings = (ratingRows ?? []) as HygieneRow[];
          if (allRatings.length) {
            chosen = locationId
              ? allRatings.find((r) => r.location_id === locationId) ?? allRatings[0]
              : allRatings[0];
          }
        }

        if (!chosen) {
          setFoodHygiene(null);
        } else {
          const rawDate =
            chosen.inspected_on ?? chosen.inspection_date ?? chosen.visit_date ?? chosen.created_at ?? null;

          if (!rawDate) {
            setFoodHygiene(null);
          } else {
            const lastDate = new Date(rawDate);
            if (Number.isNaN(lastDate.getTime())) {
              setFoodHygiene(null);
            } else {
              const nextDue = addMonths(lastDate, 18);
              const diffDays = Math.round((nextDue.getTime() - todayZero.getTime()) / 86400000);

              setFoodHygiene({
                lastInspectedOn: lastDate.toISOString().slice(0, 10),
                rating:
                  typeof chosen.rating === "number"
                    ? chosen.rating
                    : chosen.rating != null
                    ? Number(chosen.rating)
                    : null,
                nextDueOn: nextDue.toISOString().slice(0, 10),
                daysToDue: diffDays,
                overdue: diffDays < 0,
                dueSoon: diffDays >= 0 && diffDays <= 90,
              });
            }
          }
        }
      } catch (e) {
        console.error("Food hygiene fetch error", e);
        setFoodHygiene(null);
      }

      // Load signoff last (non-fatal if missing)
      await loadTodaySignoff(orgId, locationId);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to refresh manager dashboard.");
    } finally {
      setLoadingCards(false);
    }
  }

  useEffect(() => {
    if (orgId && locationId) refreshCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, locationId]);

  /* ---------- Review modal handlers ---------- */

  function openReviewModal() {
    setReviewForm({
      staff_id: "",
      category: CATEGORY_OPTIONS[0],
      rating: 5,
      notes: "",
    });
    setReviewOpen(true);
  }

  async function handleSaveReview(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !locationId) return;
    if (!reviewForm.staff_id) {
      alert("Please select a staff member.");
      return;
    }

    try {
      setSavingReview(true);
      const { staff_id, category, rating, notes } = reviewForm;

      const payload = {
        org_id: orgId,
        location_id: locationId,
        staff_id,
        review_date: todayISO,
        category,
        rating,
        notes: notes.trim() || null,
      };

      const { error } = await supabase.from("staff_reviews").insert(payload);
      if (error) throw error;

      setReviewOpen(false);
      await refreshCards();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to save review.");
    } finally {
      setSavingReview(false);
    }
  }

  /* ---------- Sign-off handlers ---------- */

  function openSignoff() {
    setSignoffNotes("");
    setSignoffOpen(true);
  }

  async function saveSignoff() {
    if (!orgId || !locationId) return;
    const ini = signoffInitials.toUpperCase().trim();
    if (!ini) {
      alert("Enter initials.");
      return;
    }

    try {
      setSavingSignoff(true);

      // Snapshot current KPI counts
      const payload = {
        org_id: orgId,
        location_id: locationId,
        signed_on: todayISO,

        manager_initials: ini,
        notes: signoffNotes.trim() || null,

        temp_logs_today: tempsSummary?.today ?? 0,
        temp_fails_7d: tempsSummary?.fails7d ?? 0,
        cleaning_logged_today: cleaningSummary?.loggedToday ?? 0,
        training_overdue: trainingSummary?.overdue ?? 0,

        qc_reviews_7d: reviewSummary?.last7 ?? 0,
        qc_reviews_30d: reviewSummary?.last30 ?? 0,
        staff_reviewed_30d: reviewSummary?.staffWithReviews ?? 0,
      };

      const { error } = await supabase.from("manager_signoffs").insert(payload);
      if (lastSignoffToday) {
        // allow multiple sign-offs, but if you want to block, enforce unique constraint instead
        // (keeping it permissive for now)
      }
      if (error) throw error;

      try {
        localStorage.setItem(LS_LAST_INITIALS, ini);
      } catch {}

      setSignoffOpen(false);
      await loadTodaySignoff(orgId, locationId);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to save sign-off. Check table/RLS.");
    } finally {
      setSavingSignoff(false);
    }
  }

  const currentLocationName =
    locations.find((l) => l.id === locationId)?.name ?? "This location";

  const trainingOverdueCount = trainingSummary?.overdue ?? 0;

  const tempsTone: "neutral" | "ok" | "warn" | "danger" =
    (tempsSummary?.fails7d ?? 0) > 0 ? "danger" : "ok";

  const trainingTone: "neutral" | "ok" | "warn" | "danger" =
    trainingOverdueCount > 0 ? "danger" : "ok";

  const foodTone: "neutral" | "ok" | "warn" | "danger" =
    !foodHygiene
      ? "neutral"
      : foodHygiene.overdue
      ? "danger"
      : foodHygiene.dueSoon
      ? "warn"
      : "ok";

  const signedOff = !!lastSignoffToday;

  /* ====================== RENDER ====================== */

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-2 pb-6 space-y-4">
      {/* Header + location picker */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Manager
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
            Manager Dashboard
          </h1>
          <div className="mt-0.5 text-xs font-medium text-slate-500">
            Today: {formatPrettyDate(today)} · {currentLocationName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={locationId ?? ""}
            onChange={(e) => setLocationId(e.target.value || null)}
            disabled={locationLoading}
            className="h-9 rounded-xl border border-slate-300 bg-white/90 px-3 text-sm shadow-sm"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={refreshCards}
            disabled={loadingCards || !orgId || !locationId}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {loadingCards ? "Refreshing…" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={openSignoff}
            disabled={!orgId || !locationId}
            className={cls(
              "rounded-xl px-4 py-2 text-sm font-extrabold shadow-sm transition",
              signedOff
                ? "bg-slate-900 text-white hover:bg-black"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            )}
            title="Create a daily manager sign-off (audit trail)"
          >
            {signedOff ? "View sign-off" : "Sign off today"}
          </button>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {err}
        </div>
      )}

      {/* Sign-off status strip */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cls(
                "inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em]",
                signedOff ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              )}
            >
              {signedOff ? "Signed off" : "Not signed off"}
            </span>

            {signedOff && lastSignoffToday ? (
              <div className="text-xs text-slate-600">
                {lastSignoffToday.manager_initials.toUpperCase()} ·{" "}
                {new Date(lastSignoffToday.signed_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-600">
                Complete QC review then sign off for audit trail.
              </div>
            )}
          </div>

          {signedOff && lastSignoffToday?.notes ? (
            <div className="text-xs text-slate-600 max-w-2xl truncate">
              Notes: <span className="font-medium">{lastSignoffToday.notes}</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* KPI cards */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-3 sm:p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiTile
            title="Temps today"
            icon="🌡"
            tone={tempsTone}
            value={tempsSummary?.today ?? 0}
            sub={
              <>
                Fails (7d):{" "}
                <span className={cls("font-semibold", (tempsSummary?.fails7d ?? 0) > 0 && "text-red-700")}>
                  {tempsSummary?.fails7d ?? 0}
                </span>
              </>
            }
          />

          <KpiTile
            title="Cleaning logged"
            icon="🧽"
            tone="ok"
            value={cleaningSummary?.loggedToday ?? 0}
            sub="Completed today"
          />

          <KpiTile
            title="Training overdue"
            icon="🎓"
            tone={trainingTone}
            value={trainingOverdueCount}
            sub={trainingOverdueCount > 0 ? "Tap to review overdue list" : "Up to date"}
            onClick={() => trainingOverdueCount > 0 && setEducationModalOpen(true)}
          />

          <KpiTile
            title="QC reviews (30d)"
            icon="📝"
            tone="neutral"
            value={reviewSummary?.last30 ?? 0}
            sub={`${reviewSummary?.staffWithReviews ?? 0} staff reviewed · ${reviewSummary?.last7 ?? 0} in 7d`}
          />

          <KpiTile
            title="Food hygiene"
            icon="⭐"
            tone={foodTone}
            value={foodHygiene?.rating ?? "—"}
            sub={
              foodHygiene
                ? foodHygiene.overdue
                  ? "Overdue"
                  : foodHygiene.dueSoon
                  ? "Due soon"
                  : "Up to date"
                : "No inspection logged yet"
            }
          />
        </div>
      </section>

      {/* QC section */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              QC Reviews
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              Log supervision checks
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl">
              Record manager checks across temps, cleaning, allergens and general standards.
              This creates an audit trail of supervision.
            </p>
          </div>

          <button
            type="button"
            onClick={openReviewModal}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black"
          >
            Log review
          </button>
        </div>
      </section>

      {/* Today’s activity */}
      <section className="rounded-3xl border border-white/40 bg-white/80 p-4 shadow-md shadow-slate-900/5 backdrop-blur">
        <div className="mb-3">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Today&apos;s activity
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            Quick review before sign-off
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Check temps and cleaning runs for this location before logging QC supervision.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Temps list */}
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Temperature logs
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTemps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        No temperature logs for today.
                      </td>
                    </tr>
                  ) : (
                    todayTemps.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time}</td>
                        <td className="px-3 py-2">{r.staff}</td>
                        <td className="px-3 py-2">{r.area}</td>
                        <td className="px-3 py-2">{r.item}</td>
                        <td className="px-3 py-2">{r.temp_c != null ? `${r.temp_c}°C` : "—"}</td>
                        <td className="px-3 py-2">
                          {r.status ? (
                            <span
                              className={cls(
                                "inline-flex rounded-full px-2 py-[1px] text-[10px] font-extrabold uppercase",
                                r.status === "pass"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              )}
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
          </div>

          {/* Cleaning runs list */}
          <div>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              Cleaning runs
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Routine</th>
                    <th className="px-3 py-2">Staff</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {todayCleaningRuns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        No cleaning routines logged for today.
                      </td>
                    </tr>
                  ) : (
                    todayCleaningRuns.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 text-slate-800">
                        <td className="px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2">{r.routine}</td>
                        <td className="px-3 py-2">{r.staff ?? "—"}</td>
                        <td className="px-3 py-2 max-w-[14rem] truncate">{r.notes ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Education overdue modal */}
      {educationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onClick={() => setEducationModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="bg-slate-900 px-4 py-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">Action needed</div>
              <div className="text-lg font-extrabold">Overdue training</div>
              <div className="text-xs opacity-80">Chase certificates and refresher training.</div>
            </div>

            <div className="p-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/90">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Staff</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Awarded</th>
                      <th className="px-3 py-2">Expired on</th>
                      <th className="px-3 py-2">Days overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {educationDue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                          No overdue training found.
                        </td>
                      </tr>
                    ) : (
                      educationDue.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 text-slate-800">
                          <td className="px-3 py-2">
                            {row.staffId ? (
                              <Link
                                href={`/team?staff=${row.staffId}`}
                                className="font-semibold text-emerald-700 hover:underline"
                              >
                                {row.staffName}
                                {row.staffInitials ? ` (${row.staffInitials.toUpperCase()})` : ""}
                              </Link>
                            ) : (
                              <>
                                {row.staffName}
                                {row.staffInitials ? ` (${row.staffInitials.toUpperCase()})` : ""}
                              </>
                            )}
                          </td>
                          <td className="px-3 py-2">{row.type ?? "—"}</td>
                          <td className="px-3 py-2">{row.awardedOn ? formatISOToUK(row.awardedOn) : "—"}</td>
                          <td className="px-3 py-2 text-red-700 font-semibold">
                            {row.expiresOn ? formatISOToUK(row.expiresOn) : "—"}
                          </td>
                          <td className="px-3 py-2 font-extrabold text-red-700">{row.daysOverdue ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEducationModalOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QC Review modal */}
      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onClick={() => !savingReview && setReviewOpen(false)}
        >
          <form
            onSubmit={handleSaveReview}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="bg-slate-900 px-4 py-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-80">QC Review</div>
              <div className="text-lg font-extrabold">Log staff review</div>
              <div className="text-xs opacity-80">Record a supervision check for audit trail.</div>
            </div>

            <div className="p-4">
              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-700 font-semibold">Staff member</span>
                <select
                  required
                  value={reviewForm.staff_id}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, staff_id: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">
                    {staffLoading ? "Loading staff…" : staffOptions.length === 0 ? "No active staff" : "Select…"}
                  </option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.initials ? ` (${s.initials.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-700 font-semibold">Area / category</span>
                <select
                  value={reviewForm.category}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-700 font-semibold">Rating (1–5)</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) || 1 }))}
                  className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <label className="mb-4 block text-sm">
                <span className="mb-1 block text-slate-700 font-semibold">Notes / feedback</span>
                <textarea
                  rows={4}
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="What did they do well? Any corrective advice?"
                  className="w-full rounded-2xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
                />
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={savingReview}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReview || !reviewForm.staff_id}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingReview ? "Saving…" : "Save review"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Sign-off modal */}
      {signoffOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onClick={() => !savingSignoff && setSignoffOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="bg-indigo-700 px-4 py-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.22em] opacity-90">
                Daily manager sign-off
              </div>
              <div className="text-lg font-extrabold">
                {formatPrettyDate(new Date(todayISO))}
              </div>
              <div className="text-xs opacity-90">{currentLocationName}</div>
            </div>

            <div className="p-4 space-y-3">
              {/* Snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                  Snapshot
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    Temps today:{" "}
                    <span className="font-extrabold text-slate-900">{tempsSummary?.today ?? 0}</span>
                  </div>
                  <div>
                    Fails (7d):{" "}
                    <span className={cls("font-extrabold", (tempsSummary?.fails7d ?? 0) > 0 ? "text-red-700" : "text-slate-900")}>
                      {tempsSummary?.fails7d ?? 0}
                    </span>
                  </div>
                  <div>
                    Cleaning today:{" "}
                    <span className="font-extrabold text-slate-900">{cleaningSummary?.loggedToday ?? 0}</span>
                  </div>
                  <div>
                    Training overdue:{" "}
                    <span className={cls("font-extrabold", trainingOverdueCount > 0 ? "text-red-700" : "text-slate-900")}>
                      {trainingOverdueCount}
                    </span>
                  </div>
                  <div>
                    QC (7d):{" "}
                    <span className="font-extrabold text-slate-900">{reviewSummary?.last7 ?? 0}</span>
                  </div>
                  <div>
                    QC (30d):{" "}
                    <span className="font-extrabold text-slate-900">{reviewSummary?.last30 ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Initials */}
              <label className="block">
                <div className="text-sm font-semibold text-slate-800">Manager initials</div>
                <input
                  value={signoffInitials}
                  onChange={(e) => setSignoffInitials(e.target.value.toUpperCase())}
                  placeholder="e.g. WS"
                  className="mt-1 h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm uppercase shadow-sm"
                  maxLength={6}
                />
              </label>

              {/* Notes */}
              <label className="block">
                <div className="text-sm font-semibold text-slate-800">Notes (optional)</div>
                <textarea
                  value={signoffNotes}
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  rows={4}
                  placeholder="Anything to note today? Issues, corrective actions, follow-ups…"
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                />
              </label>

              {lastSignoffToday && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Already signed off today at{" "}
                  {new Date(lastSignoffToday.signed_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  by {lastSignoffToday.manager_initials.toUpperCase()}.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingSignoff}
                  onClick={() => setSignoffOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingSignoff || !signoffInitials.trim()}
                  onClick={saveSignoff}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                  {savingSignoff ? "Saving…" : "Save sign-off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
