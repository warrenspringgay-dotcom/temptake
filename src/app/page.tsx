// src/app/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import FoodTempLogger from "@/components/FoodTempLogger";
import { fetchTrainingStats, getAllergenReview, fetchCloudInitials } from "@/lib/cloud";

type TempLogRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

type ReviewMeta = { interval_days: number; last: string | null; reviewer?: string | null };

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Page() {
  // Logs come from the logger component
  const [rows, setRows] = useState<TempLogRow[]>([]);
  // Staff initials from cloud team_members
  const [initials, setInitials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Training KPIs (cloud)
  const [training, setTraining] = useState<{ expired: number; dueSoon: number; total: number } | null>(null);

  // Allergen review (cloud)
  const [review, setReview] = useState<ReviewMeta | null>(null);

  const refreshFromCloud = useCallback(async () => {
    setLoading(true);
    setCloudError(null);

    const errors: string[] = [];

    const [initialsRes, trainRes, reviewRes] = await Promise.allSettled([
      fetchCloudInitials(),
      fetchTrainingStats(),
      getAllergenReview(),
    ]);

    if (initialsRes.status === "fulfilled")
      setInitials(Array.from(new Set((initialsRes.value ?? []).map((x) => (x || "").toUpperCase()))).sort());
    else errors.push("initials");

    if (trainRes.status === "fulfilled") setTraining(trainRes.value ?? { expired: 0, dueSoon: 0, total: 0 });
    else errors.push("training");

    if (reviewRes.status === "fulfilled") setReview((reviewRes.value as any) ?? null);
    // getAllergenReview() is tolerant, but if it still failed:
    else errors.push("allergen review");

    if (errors.length) setCloudError(`Could not load ${errors.join(", ")} from the cloud. Check Supabase policies and keys.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshFromCloud();
    const onFocus = () => refreshFromCloud();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshFromCloud]);

  // Log KPIs
  const kpiLastLog = useMemo(() => {
    if (!rows.length) return "—";
    const latest = rows.map((r) => r.date || "").filter(Boolean).sort().at(-1);
    return latest ?? "—";
  }, [rows]);
  const kpiTotalLogs = rows.length;
  const kpiTopLogger30d = useMemo(() => {
    const cutoff = todayISO();
    const d30 = new Date(cutoff);
    d30.setDate(d30.getDate() - 30);
    const start = d30.toISOString().slice(0, 10);
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.date || r.date < start) continue;
      const ini = (r.staff_initials || "").toUpperCase();
      if (!ini) continue;
      counts.set(ini, (counts.get(ini) ?? 0) + 1);
    }
    if (!counts.size) return "—";
    const [who] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return who;
  }, [rows]);

  // Allergen pill
  const allergenPill = useMemo(() => {
    if (!review || !review.interval_days || !review.last) return { label: "Overdue", ok: false };
    const a = new Date(review.last).setHours(0, 0, 0, 0);
    const b = new Date(todayISO()).setHours(0, 0, 0, 0);
    const diffDays = Math.round((b - a) / 86400000);
    const ok = diffDays <= review.interval_days;
    return { label: ok ? "OK" : "Overdue", ok };
  }, [review]);

  const trainingOk = (training?.expired ?? 0) === 0 && (training?.dueSoon ?? 0) === 0;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        {cloudError && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {cloudError}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Last log</div>
            <div className="text-2xl font-semibold">{loading ? "…" : kpiLastLog}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Top team logger (30d)</div>
            <div className="text-2xl font-semibold">{loading ? "…" : kpiTopLogger30d}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-slate-500">Total logs</div>
            <div className="text-2xl font-semibold">{loading ? "…" : kpiTotalLogs}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">Training expiry (≤ 60d)</div>
              <Link
                href="/team"
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  trainingOk ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
                title="Go to Team & Training"
              >
                {trainingOk ? "OK" : "Attention"}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">Allergen review</div>
              <Link
                href="/allergens"
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  allergenPill.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
                title="Go to Allergen Manager"
              >
                {allergenPill.label}
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Entry + Table */}
        <FoodTempLogger
          brandName="TempTake"
          brandAccent="#F59E0B"
          logoUrl="/temptake-192.png"
          initials={initials}
          onChange={refreshFromCloud}
          onRows={(rows) => setRows(rows)}  // ✅ Dashboard listens to logger data
        />
      </main>
    </div>
  );
}
