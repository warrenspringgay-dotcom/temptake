// src/app/(protected)/cleaning/cleaning-rota-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import { getActiveLocationIdClient } from "@/lib/locationClient";
import ManageCleaningTasksModal, {
  CLEANING_CATEGORIES,
} from "@/components/ManageCleaningTasksModal";

const PAGE = "max-w-[1100px] mx-auto px-3 sm:px-4";

// glassy panel
const CARD =
  "rounded-3xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md";

type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  org_id: string;
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null;
  month_day: number | null;
};

type Run = {
  task_id: string;
  run_on: string;
  done_by: string | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const ISO_TODAY = () => iso(new Date());
const getDow1to7 = (d: string) => ((new Date(d).getDay() + 6) % 7) + 1;
const getDom = (d: string) => new Date(d).getDate();

const isDueOn = (t: Task, y: string) =>
  t.frequency === "daily"
    ? true
    : t.frequency === "weekly"
    ? t.weekday === getDow1to7(y)
    : t.month_day === getDom(y);

const niceShort = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const niceFull = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

type CategoryPillProps = {
  title: string;
  total: number;
  open: number;
  active: boolean;
  onClick: () => void;
};

function CategoryPill({
  title,
  total,
  open,
  active,
  onClick,
}: CategoryPillProps) {
  const hasOpen = open > 0;
  const baseColor = hasOpen
    ? "bg-red-50/80 text-red-700 border-red-200/80"
    : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80";

  const activeRing = active ? "ring-2 ring-indigo-400/70" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] flex-col justify-between rounded-2xl border px-3 py-2 text-left transition-transform hover:scale-[1.02] hover:shadow-md ${baseColor} ${activeRing}`}
    >
      <div className="text-[13px] leading-tight">{title}</div>
      <div className="mt-1 text-lg font-semibold leading-none">
        {total}
        <span className="ml-1 text-[11px] opacity-75">({open} open)</span>
      </div>
    </button>
  );
}

export default function CleaningRota() {
  const today = ISO_TODAY();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const runsKey = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) m.set(`${r.task_id}|${r.run_on}`, r);
    return m;
  }, [runs]);

  const [initials, setInitials] = useState<string[]>([]);
  const [ini, setIni] = useState<string>("");

  const [manageOpen, setManageOpen] = useState(false);

  // permissions: who can manage tasks?
  const [canManage, setCanManage] = useState(true); // default true so first user isn’t locked out

  // which daily category is selected to show detail
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  /** Load initials for the org */
  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgIdClient();
      if (!orgId) return;
      const { data } = await supabase
        .from("team_members")
        .select("initials")
        .eq("org_id", orgId)
        .order("initials");

      const list = Array.from(
        new Set(
          (data ?? [])
            .map((r: any) =>
              (r.initials ?? "").toString().toUpperCase().trim()
            )
            .filter(Boolean)
        )
      );
      setInitials(list);
      if (!ini && list[0]) setIni(list[0]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load role (owner/manager/admin?) */
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const { data: userRes } = await supabase.auth.getUser();
        const email = userRes.user?.email?.toLowerCase() ?? null;

        let manage = true; // default

        if (orgId && email) {
          const { data, error } = await supabase
            .from("team_members")
            .select("role,email")
            .eq("org_id", orgId)
            .eq("email", email)
            .limit(1);

          if (!error && data && data.length > 0) {
            const role = (data[0].role ?? "").toLowerCase();
            manage =
              role === "owner" || role === "manager" || role === "admin";
          }
        }

        setCanManage(manage);
      } catch {
        setCanManage(true);
      }
    })();
  }, []);

  /** Load tasks + today's runs (org + location scoped) */
  async function loadAll() {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();

    if (!orgId) return;

    // tasks are org-wide (no location_id column in table yet)
    const { data: tData } = await supabase
      .from("cleaning_tasks")
      .select(
        "id, org_id, task, name, area, category, frequency, weekday, month_day"
      )
      .eq("org_id", orgId);

    setTasks(
      (tData ?? []).map((r: any) => ({
        id: String(r.id),
        org_id: String(r.org_id),
        task: r.task ?? r.name ?? "",
        area: r.area ?? null,
        category: r.category ?? null,
        frequency: (r.frequency ?? "daily") as Frequency,
        weekday: r.weekday ? Number(r.weekday) : null,
        month_day: r.month_day ? Number(r.month_day) : null,
      }))
    );

    // runs are by org + location
    let query = supabase
      .from("cleaning_task_runs")
      .select("task_id, run_on, done_by")
      .eq("org_id", orgId)
      .eq("run_on", today);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: rData } = await query;

    setRuns(
      (rData ?? []).map((r: any) => ({
        task_id: String(r.task_id),
        run_on: r.run_on as string,
        done_by: r.done_by ?? null,
      }))
    );
  }

  useEffect(() => {
    loadAll();
  }, [today]);

  /** Derived: what’s due today */
  const dueToday = useMemo(
    () => tasks.filter((t) => isDueOn(t, today)),
    [tasks, today]
  );
  const dailyToday = useMemo(
    () => dueToday.filter((t) => t.frequency === "daily"),
    [dueToday]
  );
  const nonDailyToday = useMemo(
    () => dueToday.filter((t) => t.frequency !== "daily"),
    [dueToday]
  );

  /** Daily summary by category */
  const dailyByCat = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const c of CLEANING_CATEGORIES) map.set(c, []);
    for (const t of dailyToday) {
      const key = t.category ?? "Opening checks";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const [k, list] of map)
      map.set(k, list.sort((a, b) => a.task.localeCompare(b.task)));
    return map;
  }, [dailyToday]);

  // pick a sensible default selected category when the data changes
  useEffect(() => {
    if (selectedCat) return;
    for (const cat of CLEANING_CATEGORIES) {
      const list = dailyByCat.get(cat) ?? [];
      if (list.length) {
        setSelectedCat(cat);
        return;
      }
    }
  }, [dailyByCat, selectedCat]);

  const doneCount = useMemo(
    () => dueToday.filter((t) => runsKey.has(`${t.id}|${today}`)).length,
    [dueToday, runsKey, today]
  );

  /** Upcoming 7 days (weekly/monthly only) */
  const days7 = useMemo(() => {
    const arr: string[] = [];
    const d = new Date(today);
    for (let i = 0; i < 7; i++) {
      arr.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [today]);

  const upcoming = useMemo(
    () =>
      days7.map((d) => ({
        day: d,
        list: tasks.filter((t) => t.frequency !== "daily" && isDueOn(t, d)),
      })),
    [days7, tasks]
  );

  /** ===== Complete helpers (always include org_id + location_id) ===== */

  async function completeOne(id: string, initialsVal: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }

    const payload = {
      org_id: orgId,
      location_id: locationId,
      task_id: id,
      run_on: today,
      done_by: initialsVal.toUpperCase(),
    };

    const { error } = await supabase
      .from("cleaning_task_runs")
      .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) => [
      ...prev,
      { task_id: id, run_on: today, done_by: payload.done_by },
    ]);
  }

  async function uncompleteOne(id: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId) {
      alert("Select a location first.");
      return;
    }

    const { error } = await supabase
      .from("cleaning_task_runs")
      .delete()
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("task_id", id)
      .eq("run_on", today);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) =>
      prev.filter((r) => !(r.task_id === id && r.run_on === today))
    );
  }

  async function completeMany(ids: string[], initialsVal: string) {
    const orgId = await getActiveOrgIdClient();
    const locationId = await getActiveLocationIdClient();
    if (!orgId || !locationId || !ids.length) {
      if (!orgId || !locationId) {
        alert("Select a location first.");
      }
      return;
    }

    const payload = ids.map((id) => ({
      org_id: orgId,
      location_id: locationId,
      task_id: id,
      run_on: today,
      done_by: initialsVal.toUpperCase(),
    }));

    const { error } = await supabase
      .from("cleaning_task_runs")
      .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    setRuns((prev) => [
      ...prev,
      ...payload.map((p) => ({
        task_id: p.task_id,
        run_on: p.run_on,
        done_by: p.done_by,
      })),
    ]);
  }

  /* ===== RENDER ===== */
  return (
    <div className={PAGE + " space-y-6 py-4"}>
      {/* Centered date at the very top */}
      <div className="mb-2 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Today
        </div>
        <div className="text-lg font-semibold text-slate-800">
          {niceFull(today)}
        </div>
      </div>

      {/* ===== Header / Actions ===== */}
      <div className={CARD + " p-4"}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold leading-tight text-slate-900">
            Cleaning rota
          </h1>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                className="shrink-0 rounded-xl bg-indigo-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                onClick={() => setManageOpen(true)}
              >
                Manage tasks
              </button>
            )}

            <label className="shrink-0 text-xs text-gray-600">Initials</label>
            <select
              value={ini}
              onChange={(e) => setIni(e.target.value.toUpperCase())}
              className="h-8 rounded-xl border border-gray-300 bg-white/70 px-5 py-1.5 uppercase shadow-sm"
            >
              {initials.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <div className="shrink-0 rounded-xl bg-slate-900/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
              {doneCount}/{dueToday.length}
            </div>

            <button
              type="button"
              className="shrink-0 rounded-xl bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              title="Complete everything due today"
              onClick={() => {
                const ids = dueToday
                  .filter((t) => !runsKey.has(`${t.id}|${today}`))
                  .map((t) => t.id);
                completeMany(ids, ini);
              }}
              disabled={
                !ini || dueToday.every((t) => runsKey.has(`${t.id}|${today}`))
              }
            >
              Complete all today
            </button>
          </div>
        </div>

        {/* ===== Weekly / Monthly due today ===== */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Weekly / Monthly
          </div>
          {nonDailyToday.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white/70 p-3 text-sm text-gray-500">
              No tasks.
            </div>
          ) : (
            nonDailyToday.map((t) => {
              const key = `${t.id}|${today}`;
              const done = runsKey.has(key);
              const run = runsKey.get(key) || null;
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-2 rounded-2xl border border-gray-200/80 bg-white/80 px-3 py-2 text-sm shadow-sm"
                >
                  <div className={done ? "text-gray-500 line-through" : ""}>
                    <div className="font-medium text-slate-900">{t.task}</div>
                    <div className="text-xs text-gray-500">
                      {t.category ?? t.area ?? "—"} •{" "}
                      {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                    </div>
                    {run?.done_by && (
                      <div className="text-[11px] text-gray-400">
                        Done by {run.done_by}
                      </div>
                    )}
                  </div>
                  {done ? (
                    <button
                      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      onClick={() => uncompleteOne(t.id)}
                    >
                      Complete
                    </button>
                  ) : (
                    <button
                      className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      onClick={() => completeOne(t.id, ini)}
                    >
                      Incomplete
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ===== Daily summary by category (pills) ===== */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Daily tasks (by category)
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CLEANING_CATEGORIES.map((cat) => {
              const list = dailyByCat.get(cat) ?? [];
              const open = list.filter(
                (t) => !runsKey.has(`${t.id}|${today}`)
              ).length;
              return (
                <CategoryPill
                  key={cat}
                  title={cat}
                  total={list.length}
                  open={open}
                  active={selectedCat === cat}
                  onClick={() => setSelectedCat(cat)}
                />
              );
            })}
          </div>

          {/* Detail list for selected category – individual tasks with completion toggles */}
          {selectedCat && (
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Today’s daily tasks – {selectedCat}
                </div>
                <div className="text-xs text-gray-500">
                  {(
                    dailyByCat.get(selectedCat) ?? []
                  ).filter((t) => !runsKey.has(`${t.id}|${today}`)).length}{" "}
                  open of {(dailyByCat.get(selectedCat) ?? []).length}
                </div>
              </div>
              <div className="space-y-2">
                {(dailyByCat.get(selectedCat) ?? []).length === 0 ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-gray-500">
                    No daily tasks in this category today.
                  </div>
                ) : (
                  (dailyByCat.get(selectedCat) ?? []).map((t) => {
                    const key = `${t.id}|${today}`;
                    const done = runsKey.has(key);
                    const run = runsKey.get(key) || null;
                    return (
                      <div
                        key={t.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-gray-200/80 bg-white/90 px-3 py-2 text-sm"
                      >
                        <div
                          className={
                            done
                              ? "text-gray-500 line-through"
                              : "text-slate-900"
                          }
                        >
                          <div className="font-medium">{t.task}</div>
                          <div className="text-xs text-gray-500">
                            {t.area ?? "—"} • Daily
                          </div>
                          {run?.done_by && (
                            <div className="text-[11px] text-gray-400">
                              Done by {run.done_by}
                            </div>
                          )}
                        </div>
                        {done ? (
                          <button
                            className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            onClick={() => uncompleteOne(t.id)}
                          >
                            Complete
                          </button>
                        ) : (
                          <button
                            className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                            onClick={() => completeOne(t.id, ini)}
                          >
                            Incomplete
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Upcoming (7 days) — weekly/monthly only ===== */}
      <div className={CARD + " p-4"}>
        <div className="mb-2 text-base font-semibold text-slate-900">
          Upcoming (next 7 days)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {upcoming.map(({ day, list }) => (
            <div
              key={day}
              className="rounded-2xl border border-gray-200/80 bg-white/80 p-3 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium text-slate-900">
                  {niceShort(day)}
                </div>
                <div className="text-xs text-gray-500">{list.length} due</div>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks</div>
              ) : (
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-gray-200/80 bg-white px-2 py-1.5 text-sm"
                    >
                      <div className="font-medium text-slate-900">
                        {t.task}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t.category ?? t.area ?? "—"} •{" "}
                        {t.frequency === "weekly" ? "Weekly" : "Monthly"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Manage Tasks Modal ===== */}
      <ManageCleaningTasksModal
        open={canManage && manageOpen}
        onClose={() => setManageOpen(false)}
        onSaved={async () => {
          await loadAll();
        }}
      />
    </div>
  );
}
