// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

/* ---------- Types ---------- */

type LocationOption = {
  id: string;
  name: string;
};

type StaffOption = {
  id: string;
  name: string;
  initials: string | null;
};

type ReviewSummary = {
  last7: number;
  last30: number;
  staffWithReviews: number;
};

type TempSummary = {
  today: number;
  fails7d: number;
};

type TrainingSummary = {
  loggedToday: number;
  overdue: number;
};

type CleaningSummary = {
  loggedToday: number;
};

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

type ActivityDayMeta = {
  iso: string;   // yyyy-mm-dd
  label: string; // e.g. Mon 23
};

type ActivityDay = {
  temps: number;
  cleaning: number;
};

type StaffActivityRow = {
  staffKey: string;
  name: string;
  initials: string;
  days: ActivityDay[];
  total: number;
};

const CATEGORY_OPTIONS = ["Temps", "Cleaning", "Allergens", "General"];
const DAY_WINDOW = 10;

/* ---------- Helpers ---------- */

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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

/* ===================================================================== */

export default function ManagerDashboardPage() {
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [tempsSummary, setTempsSummary] = useState<TempSummary | null>(null);
  const [trainingSummary, setTrainingSummary] =
    useState<TrainingSummary | null>(null);
  const [cleaningSummary, setCleaningSummary] =
    useState<CleaningSummary | null>(null);
  const [reviewSummary, setReviewSummary] =
    useState<ReviewSummary | null>(null);

  const [todayTemps, setTodayTemps] = useState<TodayTempRow[]>([]);
  const [todayCleaningRuns, setTodayCleaningRuns] = useState<
    TodayCleaningRow[]
  >([]);

  const [activityDays, setActivityDays] = useState<ActivityDayMeta[]>([]);
  const [staffActivity, setStaffActivity] = useState<StaffActivityRow[]>([]);

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

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
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
        if (activeLoc) {
          setLocationId(activeLoc);
        } else if (locs[0]) {
          setLocationId(locs[0].id);
        }
      } catch (e: any) {
        console.error(e);
        setErr(e?.message ?? "Failed to load locations.");
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  /* ---------- Load staff list for reviews (from team_members) ---------- */

  useEffect(() => {
    if (!orgId) return;

    (async () => {
      try {
        setStaffLoading(true);
        const { data, error } = await supabase
          .from("team_members")
          .select("id, name, initials, email")
          .eq("org_id", orgId)
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

  /* ---------- Refresh dashboard cards + activity lists ---------- */

  async function refreshCards() {
    if (!orgId || !locationId) {
      setErr("No location selected.");
      return;
    }

    setLoadingCards(true);
    setErr(null);

    try {
      const sevenDaysAgoISO = new Date(
        today.getTime() - 7 * 24 * 3600 * 1000
      ).toISOString();
      const thirtyDaysAgoISO = new Date(
        today.getTime() - 30 * 24 * 3600 * 1000
      ).toISOString();

      const dateStartToday = new Date(todayISO);
      const dateEndToday = new Date(dateStartToday);
      dateEndToday.setDate(dateEndToday.getDate() + 1);

      // Activity window: last 10 days including today
      const activityStart = new Date(dateStartToday);
      activityStart.setDate(activityStart.getDate() - (DAY_WINDOW - 1));
      const activityEnd = new Date(dateEndToday);

      const [
        tempsRes,
        failsRes,
        trainingRes,
        cleaningRes,
        reviewsRes,
        tempsListRes,
        cleaningListRes,
        tempsActivityRes,
        cleaningActivityRes,
      ] = await Promise.all([
        // Temps logged today (count) - filter by at
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString()),

        // Temp fails in last 7 days - filter by at
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", sevenDaysAgoISO),

        // Trainings (for org) – derive overdue & logged today from data
        supabase
          .from("trainings")
          .select("id, expires_on, created_at", { head: false })
          .eq("org_id", orgId),

        // Cleaning task runs today (count) - use done_at
        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("done_at", dateStartToday.toISOString())
          .lt("done_at", dateEndToday.toISOString()),

        // Staff reviews in last 30 days
        supabase
          .from("staff_reviews")
          .select("id, staff_id, review_date", { count: "exact", head: false })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("review_date", thirtyDaysAgoISO.slice(0, 10)),

        // Individual temp logs for today - filter by at, time from created_at/at
        supabase
          .from("food_temp_logs")
          .select("*")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        // Individual cleaning runs for today - use done_at for time
        supabase
          .from("cleaning_task_runs")
          .select("*")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("done_at", dateStartToday.toISOString())
          .lt("done_at", dateEndToday.toISOString())
          .order("done_at", { ascending: false })
          .limit(200),

        // Activity window temps (last 10 days)
        supabase
          .from("food_temp_logs")
          .select("at, created_at, staff_initials, initials")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", activityStart.toISOString())
          .lt("at", activityEnd.toISOString())
          .limit(5000),

        // Activity window cleaning runs (last 10 days)
        supabase
          .from("cleaning_task_runs")
          .select(
            "done_at, created_at, completed_by_initials, staff_initials, initials, completed_by, done_by"
          )
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("done_at", activityStart.toISOString())
          .lt("done_at", activityEnd.toISOString())
          .limit(5000),
      ]);

      /* ---- Temps summary ---- */
      setTempsSummary({
        today: tempsRes.count ?? 0,
        fails7d: failsRes.count ?? 0,
      });

      /* ---- Training summary ---- */
      const trainingRows: any[] = (trainingRes.data as any[]) ?? [];
      const today0 = new Date(todayISO);

      const loggedToday = trainingRows.filter((t) => {
        if (!t.created_at) return false;
        const d = new Date(t.created_at);
        return d.toISOString().slice(0, 10) === todayISO;
      }).length;

      const overdue = trainingRows.filter((t) => {
        if (!t.expires_on) return false;
        const d = new Date(t.expires_on);
        return d < today0;
      }).length;

      setTrainingSummary({
        loggedToday,
        overdue,
      });

      /* ---- Cleaning summary ---- */
      setCleaningSummary({
        loggedToday: cleaningRes.count ?? 0,
      });

      /* ---- Reviews summary ---- */
      const reviewRows: any[] = (reviewsRes.data as any[]) ?? [];
      const last7 = reviewRows.filter((r) => {
        if (!r.review_date) return false;
        return r.review_date >= sevenDaysAgoISO.slice(0, 10);
      }).length;
      const last30 = reviewRows.length;
      const staffSet = new Set(
        reviewRows.map((r) => (r.staff_id ? String(r.staff_id) : ""))
      );
      staffSet.delete("");
      setReviewSummary({
        last7,
        last30,
        staffWithReviews: staffSet.size,
      });

      /* ---- Today’s temp logs list ---- */
      const tempsData: any[] = (tempsListRes.data as any[]) ?? [];
      const mappedTemps: TodayTempRow[] = tempsData.map((r) => {
        const ts =
          r.created_at || r.at
            ? new Date(r.created_at ?? r.at)
            : null;

        return {
          id: String(r.id),
          time: formatTimeHM(ts) ?? "—",
          staff: r.staff_initials ?? r.initials ?? "—",
          item: r.note ?? "—",
          area: r.area ?? "—",
          temp_c: r.temp_c != null ? Number(r.temp_c) : null,
          status: r.status ?? null,
        };
      });
      setTodayTemps(mappedTemps);

      /* ---- Today’s cleaning runs list ---- */
      const cleaningData: any[] = (cleaningListRes.data as any[]) ?? [];
      const mappedCleaning: TodayCleaningRow[] = cleaningData.map((r) => {
        const doneAt: Date | null = r.done_at
          ? new Date(r.done_at)
          : r.created_at
          ? new Date(r.created_at)
          : null;

        const routineName =
          r.routine_name || r.routine || r.name || "Cleaning routine";

        const staffNameOrInitials =
          r.completed_by_initials ||
          r.staff_initials ||
          r.initials ||
          r.completed_by ||
          r.done_by ||
          null;

        const notesVal = r.notes || r.comment || null;

        return {
          id: String(r.id),
          time: formatTimeHM(doneAt),
          routine: routineName,
          staff: staffNameOrInitials,
          notes: notesVal,
        };
      });
      setTodayCleaningRuns(mappedCleaning);

      /* ---- Staff activity (last 10 days) ---- */

      const daysMeta: ActivityDayMeta[] = [];
      for (let i = 0; i < DAY_WINDOW; i++) {
        const d = new Date(activityStart);
        d.setDate(activityStart.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const label = `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()}`;
        daysMeta.push({ iso, label });
      }
      setActivityDays(daysMeta);

      const tempsActivity: any[] = (tempsActivityRes.data as any[]) ?? [];
      const cleaningActivity: any[] = (cleaningActivityRes.data as any[]) ?? [];

      const staffMap = new Map<
        string,
        { name: string; initials: string; days: ActivityDay[] }
      >();

      const getStaffRecord = (initialsRaw: string): {
        name: string;
        initials: string;
        days: ActivityDay[];
      } => {
        const trimmed = (initialsRaw || "").toUpperCase().trim();
        const key = trimmed || "UNKNOWN";

        if (!staffMap.has(key)) {
          const match = staffOptions.find(
            (s) => (s.initials || "").toUpperCase() === trimmed
          );
          const name = match?.name ?? (trimmed || "Unknown");
          const days: ActivityDay[] = Array.from(
            { length: DAY_WINDOW },
            () => ({ temps: 0, cleaning: 0 })
          );
          staffMap.set(key, { name, initials: trimmed || "—", days });
        }

        // non-null since we just set it
        return staffMap.get(key)!;
      };

      // Temps
      for (const r of tempsActivity) {
        const ts = r.at || r.created_at ? new Date(r.at ?? r.created_at) : null;
        if (!ts) continue;
        const iso = ts.toISOString().slice(0, 10);
        const dayIdx = daysMeta.findIndex((d) => d.iso === iso);
        if (dayIdx === -1) continue;

        const initialsRaw =
          (r.staff_initials || r.initials || "").toString().trim();

        const staff = getStaffRecord(initialsRaw);
        staff.days[dayIdx].temps += 1;
      }

      // Cleaning
      for (const r of cleaningActivity) {
        const ts =
          r.done_at || r.created_at ? new Date(r.done_at ?? r.created_at) : null;
        if (!ts) continue;
        const iso = ts.toISOString().slice(0, 10);
        const dayIdx = daysMeta.findIndex((d) => d.iso === iso);
        if (dayIdx === -1) continue;

        const initialsRaw =
          (r.completed_by_initials ||
            r.staff_initials ||
            r.initials ||
            r.completed_by ||
            r.done_by ||
            "").toString().trim();

        const staff = getStaffRecord(initialsRaw);
        staff.days[dayIdx].cleaning += 1;
      }

      const activityRows: StaffActivityRow[] = Array.from(
        staffMap.entries()
      ).map(([key, value]) => {
        const total = value.days.reduce(
          (acc, d) => acc + d.temps + d.cleaning,
          0
        );
        return {
          staffKey: key,
          name: value.name,
          initials: value.initials,
          days: value.days,
          total,
        };
      });

      activityRows.sort((a, b) => b.total - a.total);
      setStaffActivity(activityRows);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to refresh manager dashboard.");
    } finally {
      setLoadingCards(false);
    }
  }

  useEffect(() => {
    if (orgId && locationId) {
      void refreshCards();
    }
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

  const currentLocationName =
    locations.find((l) => l.id === locationId)?.name ?? "This location";

  /* ====================== RENDER ====================== */

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      {/* Header + location picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Manager
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Manager Dashboard
          </h1>
          <div className="mt-1 text-xs text-slate-500">
            Today: {formatPrettyDate(today)}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Location
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
              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            Current: {currentLocationName}
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {err}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Temps */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Temps logged today
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {tempsSummary?.today ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Temperature fails (7d):{" "}
            <span className="font-semibold text-red-600">
              {tempsSummary?.fails7d ?? 0}
            </span>
          </div>
        </div>

        {/* Cleaning */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cleaning tasks logged today
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {cleaningSummary?.loggedToday ?? 0}
          </div>
        </div>

        {/* Training */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Training status
          </div>
          <div className="mt-1 text-sm text-slate-700">
            <div>
              Logged today:{" "}
              <span className="font-semibold">
                {trainingSummary?.loggedToday ?? 0}
              </span>
            </div>
            <div>
              <span className="text-red-600">Overdue:</span>{" "}
              <span className="font-semibold text-red-600">
                {trainingSummary?.overdue ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* QC Reviews summary */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            QC reviews
          </div>
          <div className="mt-1 space-y-1 text-sm text-slate-700">
            <div>
              Logged (7d):{" "}
              <span className="font-semibold">
                {reviewSummary?.last7 ?? 0}
              </span>
            </div>
            <div>
              Logged (30d):{" "}
              <span className="font-semibold">
                {reviewSummary?.last30 ?? 0}
              </span>
            </div>
            <div>
              Staff reviewed:{" "}
              <span className="font-semibold">
                {reviewSummary?.staffWithReviews ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QC section with button */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              QC Reviews
            </div>
            <div className="text-sm text-slate-700">
              Logged by managers / supervisors
            </div>
          </div>
          <button
            type="button"
            onClick={openReviewModal}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-black"
          >
            Log review
          </button>
        </div>
        <div className="text-xs text-slate-500">
          Use this to regularly review staff actions (temps, cleaning,
          allergens, general standards) and keep an audit trail of
          supervision.
        </div>
      </div>

      {/* Today’s activity */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Today&apos;s activity
            </div>
            <div className="text-sm text-slate-700">
              Detailed list of temps and cleaning runs for manager review
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Temps list */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Temperature logs (today)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">Time</th>
                    <th className="px-2 py-1">Staff</th>
                    <th className="px-2 py-1">Area</th>
                    <th className="px-2 py-1">Item</th>
                    <th className="px-2 py-1">Temp</th>
                    <th className="px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTemps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-2 py-3 text-center text-slate-500"
                      >
                        No temperature logs for today.
                      </td>
                    </tr>
                  ) : (
                    todayTemps.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-2 py-1">{r.time}</td>
                        <td className="px-2 py-1">{r.staff}</td>
                        <td className="px-2 py-1">{r.area}</td>
                        <td className="px-2 py-1">{r.item}</td>
                        <td className="px-2 py-1">
                          {r.temp_c != null ? `${r.temp_c}°C` : "—"}
                        </td>
                        <td className="px-2 py-1">
                          {r.status ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-[1px] text-[10px] font-semibold ${
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
          </div>

          {/* Cleaning runs list */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cleaning routines completed (today)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1">Time</th>
                    <th className="px-2 py-1">Routine</th>
                    <th className="px-2 py-1">Staff</th>
                    <th className="px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {todayCleaningRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-3 text-center text-slate-500"
                      >
                        No cleaning routines logged for today.
                      </td>
                    </tr>
                  ) : (
                    todayCleaningRuns.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-2 py-1">{r.time ?? "—"}</td>
                        <td className="px-2 py-1">{r.routine}</td>
                        <td className="px-2 py-1">{r.staff ?? "—"}</td>
                        <td className="px-2 py-1 max-w-[12rem] truncate">
                          {r.notes ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          Managers can quickly scroll these lists before logging their QC review
          to confirm all work has been completed to standard.
        </div>
      </div>

      {/* Staff activity – last 10 days */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Staff activity
            </div>
            <div className="text-sm text-slate-700">
              Who&apos;s been active on the app in the last 10 days
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/reports")}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View more in reports
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/95">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-2 py-1 sticky left-0 bg-slate-50/90">
                  Staff
                </th>
                {activityDays.map((d) => (
                  <th key={d.iso} className="px-2 py-1 text-center">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffActivity.length === 0 ? (
                <tr>
                  <td
                    colSpan={activityDays.length + 1}
                    className="px-2 py-3 text-center text-slate-500"
                  >
                    No activity recorded in the last 10 days.
                  </td>
                </tr>
              ) : (
                staffActivity.map((row) => (
                  <tr
                    key={row.staffKey}
                    className="border-t border-slate-100 text-slate-800"
                  >
                    <td className="px-2 py-1 sticky left-0 bg-white/95 font-semibold">
                      {row.name}
                      {row.initials && row.initials !== "—"
                        ? ` (${row.initials})`
                        : ""}
                    </td>
                    {row.days.map((d, idx) => {
                      const hasActivity = d.temps > 0 || d.cleaning > 0;
                      return (
                        <td
                          key={idx}
                          className={`px-2 py-1 text-center ${
                            hasActivity
                              ? "bg-emerald-50 text-emerald-900 font-medium"
                              : "text-slate-400"
                          }`}
                        >
                          {hasActivity ? `${d.temps}T / ${d.cleaning}C` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          T = temperature logs, C = completed cleaning routines. A quick way to
          see who&apos;s consistently active on the app.
        </div>
      </div>

      {/* Review modal */}
      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-up justify-center bg-black/40 px-3"
          onClick={() => !savingReview && setReviewOpen(false)}
        >
          <form
            onSubmit={handleSaveReview}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Log staff review
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={savingReview}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* Staff select */}
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-700">
                Staff member
              </span>
              <select
                required
                value={reviewForm.staff_id}
                onChange={(e) =>
                  setReviewForm((prev) => ({
                    ...prev,
                    staff_id: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
              >
                <option value="">
                  {staffLoading
                    ? "Loading staff…"
                    : staffOptions.length === 0
                    ? "No active staff"
                    : "Select…"}
                </option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.initials ? ` (${s.initials.toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Category */}
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-700">
                Area / category
              </span>
              <select
                value={reviewForm.category}
                onChange={(e) =>
                  setReviewForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Rating */}
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-700">
                Rating (1–5)
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={reviewForm.rating}
                onChange={(e) =>
                  setReviewForm((prev) => ({
                    ...prev,
                    rating: Number(e.target.value) || 1,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
              />
            </label>

            {/* Notes */}
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-slate-700">
                Notes / feedback
              </span>
              <textarea
                rows={4}
                value={reviewForm.notes}
                onChange={(e) =>
                  setReviewForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="What did they do well? Any corrective advice?"
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                disabled={savingReview}
                className="rounded-xl px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReview || !reviewForm.staff_id}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingReview ? "Saving…" : "Save review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
