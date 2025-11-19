// src/app/(protected)/manager/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";

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
  today: number;
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

type SignoffSummary = {
  todaySigned: boolean;
  lastSignedDate: string | null; // ISO yyyy-mm-dd
  countLast30: number;
};

const CATEGORY_OPTIONS = ["Temps", "Cleaning", "Allergens", "General"];

// deterministic formatter (no locale / no comma) to avoid hydration issues
function formatPrettyDate(d: Date) {
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

  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();

  // e.g. "Wednesday 19 November 2025"
  return `${weekday} ${day} ${month} ${year}`;
}

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

  const [signoffSummary, setSignoffSummary] =
    useState<SignoffSummary | null>(null);
  const [savingSignoff, setSavingSignoff] = useState(false);

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

  // manager identity (for sign-off audit)
  const [managerId, setManagerId] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  /* ---------- Boot: org + location + auth ---------- */

  useEffect(() => {
    (async () => {
      // who is logged in (for sign-off)
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setManagerId(userData.user.id);
        setManagerEmail(userData.user.email ?? null);
      }

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

  /* ---------- Load staff for dropdown (team_members) ---------- */

  useEffect(() => {
    if (!orgId) return;

    (async () => {
      try {
        setStaffLoading(true);

        const { data, error } = await supabase
          .from("team_members")
          .select("id, name, initials, active")
          .eq("org_id", orgId)
          .eq("active", true)
          .order("name", { ascending: true });

        if (error) throw error;

        const staffList: StaffOption[] =
          data?.map((r: any) => ({
            id: String(r.id),
            name: r.name ?? "Unnamed",
            initials: r.initials ?? null,
          })) ?? [];

        setStaffOptions(staffList);

        // reset selection if invalid
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

  /* ---------- Refresh dashboard cards ---------- */

  async function refreshCards() {
    if (!orgId || !locationId) {
      setErr("No location selected.");
      return;
    }

    setLoadingCards(true);
    setErr(null);

    try {
      const sevenDaysAgo = new Date(
        today.getTime() - 7 * 24 * 3600 * 1000
      ).toISOString();
      const thirtyDaysAgo = new Date(
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
        signoffRes,
      ] = await Promise.all([
        // Temps logged today
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("at", dateStartToday.toISOString())
          .lt("at", dateEndToday.toISOString()),
        // Failures in last 7 days
        supabase
          .from("food_temp_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("status", "fail")
          .gte("at", sevenDaysAgo),
        // Trainings (for org)
        supabase
          .from("trainings")
          .select("id, expires_on, created_at", {
            count: "exact",
            head: false,
          })
          .eq("org_id", orgId),
        // Cleaning task runs today
        supabase
          .from("cleaning_task_runs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .eq("run_on", todayISO),
        // Staff reviews (last 30 days)
        supabase
          .from("staff_reviews")
          .select("id, staff_id, review_date", {
            count: "exact",
            head: false,
          })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("review_date", thirtyDaysAgo.slice(0, 10)),
        // Daily manager sign-offs (last 30 days)
        supabase
          .from("manager_signoffs")
          .select("signed_date", { count: "exact", head: false })
          .eq("org_id", orgId)
          .eq("location_id", locationId)
          .gte("signed_date", thirtyDaysAgo.slice(0, 10)),
      ]);

      // Temps
      setTempsSummary({
        today: tempsRes.count ?? 0,
        fails7d: failsRes.count ?? 0,
      });

      // Training summary
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

      // Cleaning
      setCleaningSummary({
        loggedToday: cleaningRes.count ?? 0,
      });

      // Reviews summary
      const reviewRows: any[] = (reviewsRes.data as any[]) ?? [];
      const todayReviews = reviewRows.filter(
        (r) => r.review_date === todayISO
      ).length;
      const last7 = reviewRows.filter((r) => {
        if (!r.review_date) return false;
        return r.review_date >= sevenDaysAgo.slice(0, 10);
      }).length;
      const last30 = reviewRows.length;
      const staffSet = new Set(
        reviewRows.map((r) => (r.staff_id ? String(r.staff_id) : ""))
      );
      staffSet.delete("");
      setReviewSummary({
        today: todayReviews,
        last7,
        last30,
        staffWithReviews: staffSet.size,
      });

      // Manager sign-off summary
      const signoffRows: any[] = (signoffRes.data as any[]) ?? [];
      let todaySigned = false;
      let lastSignedDate: string | null = null;
      if (signoffRows.length) {
        todaySigned = signoffRows.some(
          (r) => r.signed_date === todayISO
        );
        lastSignedDate = signoffRows
          .map((r) => r.signed_date as string)
          .sort()
          .slice(-1)[0];
      }
      setSignoffSummary({
        todaySigned,
        lastSignedDate,
        countLast30: signoffRows.length,
      });
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

  /* ---------- Daily sign-off handler ---------- */

  async function handleDailySignoff() {
    if (!orgId || !locationId) return;
    if (signoffSummary?.todaySigned) return;

    try {
      setSavingSignoff(true);
      const { error } = await supabase.from("manager_signoffs").insert({
        org_id: orgId,
        location_id: locationId,
        signed_date: todayISO,
        manager_id: managerId,
        manager_email: managerEmail,
      });
      if (error) throw error;

      await refreshCards();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to record daily review.");
    } finally {
      setSavingSignoff(false);
    }
  }

  const currentLocationName =
    locations.find((l) => l.id === locationId)?.name ?? "This location";

  const prettyLastSignoff =
    signoffSummary?.lastSignedDate ?? null
      ? formatPrettyDate(new Date(signoffSummary!.lastSignedDate!))
      : "—";

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
              Logged today:{" "}
              <span className="font-semibold">
                {reviewSummary?.today ?? 0}
              </span>
            </div>
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

      {/* Today summary card */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Today&apos;s activity summary
        </div>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>
            Temps logged:{" "}
            <span className="font-semibold">
              {tempsSummary?.today ?? 0}
            </span>
          </li>
          <li>
            Cleaning tasks completed:{" "}
            <span className="font-semibold">
              {cleaningSummary?.loggedToday ?? 0}
            </span>
          </li>
          <li>
            Training records added today:{" "}
            <span className="font-semibold">
              {trainingSummary?.loggedToday ?? 0}
            </span>
          </li>
          <li>
            QC reviews logged today:{" "}
            <span className="font-semibold">
              {reviewSummary?.today ?? 0}
            </span>
          </li>
        </ul>
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

      {/* Daily manager sign-off */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Daily manager review
            </div>
            <div className="text-sm text-slate-700">
              Confirm that today&apos;s logs and checks have been reviewed.
            </div>
          </div>
          <button
            type="button"
            onClick={handleDailySignoff}
            disabled={savingSignoff || signoffSummary?.todaySigned}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium text-white shadow-sm ${
              signoffSummary?.todaySigned
                ? "bg-emerald-500 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-60`}
          >
            {signoffSummary?.todaySigned
              ? "Today reviewed"
              : savingSignoff
              ? "Saving…"
              : "Confirm daily review"}
          </button>
        </div>
        <div className="mt-1 text-xs text-slate-600 space-y-1">
          <div>
            Status:{" "}
            {signoffSummary?.todaySigned ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Today checked
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Not yet checked
              </span>
            )}
          </div>
          <div>Last signed off: {prettyLastSignoff}</div>
          <div>
            Sign-offs in last 30 days:{" "}
            <span className="font-semibold">
              {signoffSummary?.countLast30 ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Review modal */}
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

            {/* Staff select – from team_members */}
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-700">Staff member</span>
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
