// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

const CATEGORY_OPTIONS = ["Temps", "Cleaning", "Allergens", "General"];

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

function formatISOToUK(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/* ===================================================================== */

export default function ManagerDashboardPage() {
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

  const [educationDue, setEducationDue] = useState<EducationRow[]>([]);

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

      const [
        tempsRes,
        failsRes,
        trainingRes,
        cleaningRes,
        reviewsRes,
        tempsListRes,
        cleaningListRes,
      ] = await Promise.all([
        // Temps logged today (count)
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString()),

        // Temp fails in last 7 days
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", sevenDaysAgoISO),

        // Trainings – used for summary + education modal
        supabase
          .from("trainings")
          .select("id, staff_id, type, awarded_on, expires_on, created_at")
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
          .select("id, staff_id, review_date", {
            count: "exact",
            head: false,
          })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("review_date", thirtyDaysAgoISO.slice(0, 10)),

        // Individual temp logs for today
        supabase
          .from("food_temp_logs")
          .select("*")
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString())
          .order("at", { ascending: false })
          .limit(200),

        // Individual cleaning runs for today
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

      /* ---- Temps summary ---- */
      setTempsSummary({
        today: tempsRes.count ?? 0,
        fails7d: failsRes.count ?? 0,
      });

      /* ---- Training summary + educationDue ---- */
      const trainingRows: any[] = (trainingRes.data as any[]) ?? [];
      const today0 = new Date(todayISO);
      today0.setHours(0, 0, 0, 0);

      // staff IDs we need names for
      const staffIds = Array.from(
        new Set(
          trainingRows
            .map((t) => t.staff_id)
            .filter((id) => id != null)
            .map((id) => String(id))
        )
      );

      const staffMap = new Map<
        string,
        { name: string; initials: string | null }
      >();

      if (staffIds.length) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, initials")
          .in("id", staffIds);

        for (const s of staffData ?? []) {
          staffMap.set(String(s.id), {
            name: s.name ?? "Unknown",
            initials: s.initials ?? null,
          });
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

          const daysOver =
            Math.round((today0.getTime() - exp.getTime()) / 86400000) || 0;

          return {
            id: String(t.id),
            staffId: t.staff_id ? String(t.staff_id) : null,
            staffName: staff?.name ?? "Unknown",
            staffInitials: staff?.initials ?? null,
            type: t.type ?? null,
            awardedOn: t.awarded_on
              ? new Date(t.awarded_on).toISOString().slice(0, 10)
              : null,
            expiresOn: exp.toISOString().slice(0, 10),
            daysOverdue: daysOver > 0 ? daysOver : null,
          } as EducationRow;
        })
        .filter((r) => r.daysOverdue != null && r.daysOverdue > 0)
        .sort(
          (a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0)
        );

      setTrainingSummary({
        loggedToday,
        overdue: overdueRows.length,
      });
      setEducationDue(overdueRows);

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
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed to refresh manager dashboard.");
    } finally {
      setLoadingCards(false);
    }
  }

  useEffect(() => {
    if (orgId && locationId) {
      refreshCards();
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

  const trainingOverdueCount = trainingSummary?.overdue ?? 0;

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

        {/* Training / Education */}
        <button
          type="button"
          onClick={() =>
            trainingOverdueCount > 0 && setEducationModalOpen(true)
          }
          className={`relative rounded-2xl border border-slate-200 bg-white/90 p-3 text-left shadow-sm transition ${
            trainingOverdueCount > 0
              ? "ring-2 ring-red-400/70 hover:ring-red-500/80"
              : "hover:border-slate-300"
          }`}
        >
          {trainingOverdueCount > 0 && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Action needed
              </span>
            </div>
          )}
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Training / Education
          </div>
          <div className="mt-1 text-sm text-slate-700">
            <div>
              Logged today:{" "}
              <span className="font-semibold">
                {trainingSummary?.loggedToday ?? 0}
              </span>
            </div>
            <div>
              <span
                className={
                  trainingOverdueCount > 0
                    ? "text-red-600 font-semibold"
                    : "text-slate-700"
                }
              >
                Overdue:
              </span>{" "}
              <span
                className={
                  trainingOverdueCount > 0
                    ? "font-semibold text-red-600"
                    : "font-semibold"
                }
              >
                {trainingOverdueCount}
              </span>
              {trainingOverdueCount > 0 && (
                <span className="ml-1 text-[11px] text-red-700/80">
                  (tap for details)
                </span>
              )}
            </div>
          </div>
        </button>

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

      {/* Education overdue modal */}
      {educationModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onClick={() => setEducationModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  Staff training / education overdue
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Use this list to chase certificates and refresher training.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEducationModalOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
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
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        No overdue training found.
                      </td>
                    </tr>
                  ) : (
                    educationDue.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-100 text-slate-800"
                      >
                        <td className="px-3 py-2">
                          {row.staffId ? (
                            <Link
                              href={`/team?staff=${row.staffId}`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              {row.staffName}
                              {row.staffInitials
                                ? ` (${row.staffInitials.toUpperCase()})`
                                : ""}
                            </Link>
                          ) : (
                            <>
                              {row.staffName}
                              {row.staffInitials
                                ? ` (${row.staffInitials.toUpperCase()})`
                                : ""}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.type ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.awardedOn
                            ? formatISOToUK(row.awardedOn)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-red-700">
                          {row.expiresOn
                            ? formatISOToUK(row.expiresOn)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold text-red-700">
                          {row.daysOverdue ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
