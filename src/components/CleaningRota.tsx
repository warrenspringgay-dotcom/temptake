"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import ManageCleaningTasksModal, {
  CLEANING_CATEGORIES,
} from "@/components/ManageCleaningTasksModal";

/* ================= Types ================= */
type Frequency = "daily" | "weekly" | "monthly";

type Task = {
  id: string; // uuid
  org_id: string; // uuid
  task: string;
  area: string | null;
  category: string | null;
  frequency: Frequency;
  weekday: number | null; // 1..7
  month_day: number | null; // 1..31
};

type Run = {
  task_id: string; // uuid
  run_on: string; // yyyy-mm-dd
  done_by: string | null;
};

/* ================= Helpers ================= */
const CARD =
  "rounded-2xl border border-gray-200 bg-white shadow-sm";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ISO_TODAY = () => iso(new Date());
const nice = (ymd: string) =>
  new Date(ymd).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
const getDow1to7 = (ymd: string) =>
  ((new Date(ymd).getDay() + 6) % 7) + 1;
const getDom = (ymd: string) => new Date(ymd).getDate();
const isDueOn = (t: Task, ymd: string) =>
  t.frequency === "daily"
    ? true
    : t.frequency === "weekly"
    ? t.weekday === getDow1to7(ymd)
    : t.month_day === getDom(ymd);

function CategoryPill({
  title,
  total,
  open,
  onClick,
}: {
  title: string;
  total: number;
  open: number;
  onClick: () => void;
}) {
  const hasOpen = open > 0;
  const color =
    hasOpen
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left ${color}`}
    >
      <div className="text-xs">{title}</div>
      <div className="text-lg font-semibold">
        {total}
        <span className="ml-1 text-[11px] opacity-75">
          ({open} open)
        </span>
      </div>
    </button>
  );
}

function Pill({
  done,
  onClick,
}: {
  done: boolean;
  onClick: () => void;
}) {
  return done ? (
    <button
      className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
      onClick={onClick}
      title="Mark incomplete"
    >
      Complete
    </button>
  ) : (
    <button
      className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
      onClick={onClick}
      title="Mark complete"
    >
      Incomplete
    </button>
  );
}

/** Modal: list daily tasks within a category (for today) */
function DailyCategoryModal({
  open,
  category,
  tasks,
  runsKey,
  today,
  initials,
  onClose,
  onCompleteOne,
  onUncompleteOne,
}: {
  open: boolean;
  category: string;
  tasks: Task[];
  runsKey: Map<string, Run>;
  today: string;
  initials: string;
  onClose: () => void;
  onCompleteOne: (id: string, initials: string) => Promise<void>;
  onUncompleteOne: (id: string) => Promise<void>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose}>
      <div
        className={`${CARD} mx-auto mt-10 w-full max-w-md overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-semibold">
            Today · {category}
          </div>
          <button
            className="rounded-md px-2 py-1 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
          {tasks.length === 0 ? (
            <div className="rounded-xl border p-3 text-sm text-gray-500">
              No tasks.
            </div>
          ) : (
            tasks.map((t) => {
              const key = `${t.id}|${today}`;
              const done = runsKey.has(key);
              const run = runsKey.get(key) || null;
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-2 rounded-xl border px-2 py-2 text-sm"
                >
                  <div className={done ? "text-gray-500 line-through" : ""}>
                    <div className="font-medium">{t.task}</div>
                    <div className="text-xs text-gray-500">
                      {t.area ?? "—"}
                    </div>
                    {run?.done_by && (
                      <div className="text-[11px] text-gray-400">
                        Done by {run.done_by}
                      </div>
                    )}
                  </div>
                  <Pill
                    done={done}
                    onClick={() =>
                      done
                        ? onUncompleteOne(t.id)
                        : onCompleteOne(t.id, initials)
                    }
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= Main ================= */
export default function CleaningRota() {
  const today = ISO_TODAY();

  // data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const runsKey = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) m.set(`${r.task_id}|${r.run_on}`, r);
    return m;
  }, [runs]);

  // initials
  const [initials, setInitials] = useState<string[]>([]);
  const [ini, setIni] = useState<string>("");

  // UI state
  const [manageOpen, setManageOpen] = useState(false);
  const [catOpen, setCatOpen] = useState<string | null>(null);

  /* load initials (org-scoped optional; simple list is fine) */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("initials")
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
  }, [ini]);

  /* load tasks + runs */
  async function loadAll() {
    const { data: tData } = await supabase
      .from("cleaning_tasks")
      .select(
        "id, org_id, task, area, category, frequency, weekday, month_day"
      );

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

    const { data: rData } = await supabase
      .from("cleaning_task_runs")
      .select("task_id, run_on, done_by")
      .eq("run_on", today);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  /* derived: due today */
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

  // daily by category
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

  const doneCount = useMemo(
    () => dueToday.filter((t) => runsKey.has(`${t.id}|${today}`)).length,
    [dueToday, runsKey, today]
  );

  /* Upcoming 7 days — non-daily only */
  const days7 = useMemo(() => {
    const arr: string[] = [];
    const d = new Date(today);
    for (let i = 0; i < 7; i++) {
      arr.push(iso(new Date(d)));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [today]);

  const upcoming = useMemo(
    () =>
      days7.map((d) => ({
        day: d,
        list: tasks.filter(
          (t) => t.frequency !== "daily" && isDueOn(t, d)
        ),
      })),
    [days7, tasks]
  );

  /* complete / uncomplete – always use active org_id (fixes FK error) */
  async function completeOne(id: string, initialsVal: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }
      const payload = {
        org_id,
        task_id: id,
        run_on: today,
        done_by: initialsVal.toUpperCase(),
      };
      const { error } = await supabase
        .from("cleaning_task_runs")
        .insert(payload);
      if (error) throw error;
      setRuns((prev) => [
        ...prev,
        { task_id: id, run_on: today, done_by: payload.done_by },
      ]);
    } catch (e: any) {
      alert(e?.message || "Failed to save completion.");
    }
  }

  async function uncompleteOne(id: string) {
    try {
      const org_id = await getActiveOrgIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }
      const { error } = await supabase
        .from("cleaning_task_runs")
        .delete()
        .eq("org_id", org_id)
        .eq("task_id", id)
        .eq("run_on", today);
      if (error) throw error;
      setRuns((prev) =>
        prev.filter((r) => !(r.task_id === id && r.run_on === today))
      );
    } catch (e: any) {
      alert(e?.message || "Failed to undo completion.");
    }
  }

  async function completeMany(ids: string[], initialsVal: string) {
    try {
      if (!ids.length) return;
      const org_id = await getActiveOrgIdClient();
      if (!org_id) {
        alert("No organisation found.");
        return;
      }
      const payload = ids.map((id) => ({
        org_id,
        task_id: id,
        run_on: today,
        done_by: initialsVal.toUpperCase(),
      }));
      const { error } = await supabase
        .from("cleaning_task_runs")
        .insert(payload);
      if (error) throw error;
      setRuns((prev) => [
        ...prev,
        ...payload.map((p) => ({
          task_id: p.task_id,
          run_on: p.run_on,
          done_by: p.done_by,
        })),
      ]);
    } catch (e: any) {
      alert(e?.message || "Failed to save completion.");
    }
  }

  /* ================= Render ================= */
  return (
    <div className="space-y-6">
      {/* Today summary */}
      <div className={`${CARD} p-4`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">Cleaning rota</div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => setManageOpen(true)}
            >
              Manage tasks
            </button>

            <label className="text-xs text-gray-600">Initials</label>
            <select
              value={ini}
              onChange={(e) => setIni(e.target.value.toUpperCase())}
              className="h-9 rounded-xl border border-gray-200 px-2 py-1.5 uppercase"
            >
              {initials.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <div className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm">
              {doneCount}/{dueToday.length}
            </div>

            <button
              type="button"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
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

        {/* Weekly / Monthly due today */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Weekly / Monthly
          </div>
          {nonDailyToday.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-500">
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
                  className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 px-2 py-2 text-sm"
                >
                  <div className={done ? "text-gray-500 line-through" : ""}>
                    <div className="font-medium">{t.task}</div>
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
                  <Pill
                    done={done}
                    onClick={() =>
                      done ? uncompleteOne(t.id) : completeOne(t.id, ini)
                    }
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Daily – category summary only (click to open modal) */}
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase text-gray-500">
            Daily tasks (by category)
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
                  onClick={() => setCatOpen(cat)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming (7 days) – non-daily only */}
      <div className={`${CARD} p-4`}>
        <div className="mb-2 text-base font-semibold">
          Upcoming (next 7 days)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {upcoming.map(({ day, list }) => (
            <div key={day} className="rounded-xl border border-gray-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium">{nice(day)}</div>
                <div className="text-xs text-gray-500">{list.length} due</div>
              </div>
              {list.length === 0 ? (
                <div className="text-sm text-gray-500">No tasks</div>
              ) : (
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      <div className="font-medium">{t.task}</div>
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

      {/* Modals */}
      <ManageCleaningTasksModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onSaved={async () => {
          await loadAll();
        }}
      />

      <DailyCategoryModal
        open={!!catOpen}
        category={catOpen || ""}
        tasks={(catOpen ? dailyByCat.get(catOpen) : []) || []}
        today={today}
        initials={ini}
        runsKey={runsKey}
        onClose={() => setCatOpen(null)}
        onCompleteOne={completeOne}
        onUncompleteOne={uncompleteOne}
      />
    </div>
  );
}
