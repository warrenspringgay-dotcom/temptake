"use server";

import { requireUser } from "@/lib/requireUser";
import { getServerSupabase } from "@/lib/supabaseServer";

/* =========================
   Existing logs API
========================= */

export type LogRow = {
  id: string;
  at: string;
  routine_id: string | null;
  routine_item_id: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  staff_initials: string | null;
  temp_c: number | null;
  status: string | null;
  location_id?: string | null;
};

export async function listLogs(
  opts: { from?: string; to?: string; limit?: number; locationId?: string | null } = {}
) {
  const sb = await getServerSupabase();

  let q = sb
    .from("food_temp_logs")
    .select(
      "id,at,routine_id,routine_item_id,area,note,target_key,staff_initials,temp_c,status,location_id"
    )
    .order("at", { ascending: false });

  if (opts.from) q = q.gte("at", opts.from);
  if (opts.to) q = q.lte("at", opts.to);

  // ✅ Location scoping (if provided)
  if (opts.locationId) q = q.eq("location_id", opts.locationId);

  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LogRow[];
}

/* =========================
   Custom Report
========================= */

export type CustomReport = {
  period: { from?: string; to?: string; locationId?: string | null };
  totals: {
    total: number;
    fails: number;
    pass: number;
    failRatePct: number;
  };
  logs: LogRow[];
};

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10; // 0.1%
}

export async function getCustomReport(
  opts: { from?: string; to?: string; limit?: number; locationId?: string | null } = {}
): Promise<CustomReport> {
  await requireUser();

  const logs = await listLogs(opts);

  const total = logs.length;
  const fails = logs.filter((r) => String(r.status ?? "").toLowerCase() === "fail").length;
  const pass = total - fails;

  return {
    period: { from: opts.from, to: opts.to, locationId: opts.locationId ?? null },
    totals: {
      total,
      fails,
      pass,
      failRatePct: pct(fails, total),
    },
    logs,
  };
}

/* =========================
   Four-Weekly Review (SFBB)
========================= */

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(ymd: string, days: number) {
  const d = new Date(ymd);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(aYmd: string, bYmd: string) {
  const a = new Date(aYmd);
  const b = new Date(bYmd);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function safeKey(...parts: Array<string | null | undefined>) {
  return parts.map((p) => (p ?? "").trim().toLowerCase()).join("|");
}

/** Mon=1..Sun=7 */
function dow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1;
}
function dom(ymd: string) {
  return new Date(ymd).getDate();
}
type Frequency = "daily" | "weekly" | "monthly";
function isDueOn(
  t: { frequency: Frequency; weekday: number | null; month_day: number | null },
  ymd: string
) {
  switch (t.frequency) {
    case "daily":
      return true;
    case "weekly":
      return t.weekday === dow1to7(ymd);
    case "monthly":
      return t.month_day === dom(ymd);
    default:
      return false;
  }
}

export type FourWeekTempRepeat = {
  key: string;
  area: string;
  item: string;
  count: number;
  lastSeenOn: string;
};

export type FourWeekMissedClean = {
  taskId: string;
  task: string;
  category: string | null;
  area: string | null;
  missedCount: number;
  lastMissedOn: string;
};

export type FourWeekTrainingDrift = {
  staffName: string;
  staffInitials: string | null;
  type: string;
  expiresOn: string;
  daysLeft: number;
  status: "expired" | "due_soon";
};

export type FourWeekSummary = {
  period: { from: string; to: string; days: number; locationId?: string | null };

  temperature: {
    total: number;
    fails: number;
    failRatePct: number;
    repeatFailures: FourWeekTempRepeat[];
  };

  cleaning: {
    dueTotal: number;
    completedTotal: number;
    missedTotal: number;
    repeatMisses: FourWeekMissedClean[];
  };

  training: {
    expired: number;
    dueSoon: number;
    drift: FourWeekTrainingDrift[];
  };

  headline: string[];
  recommendations: string[];
};

export async function getFourWeeklyReview(
  opts: { to?: string; locationId?: string | null } = {}
): Promise<FourWeekSummary> {
  await requireUser();
  const sb = await getServerSupabase();

  const to = (opts.to ?? isoToday()).slice(0, 10);
  const from = addDays(to, -27);
  const locationId = opts.locationId ?? null;

  /* ---------- 1) Temperature trends ---------- */
  let tQ = sb
    .from("food_temp_logs")
    .select("id,at,area,note,target_key,staff_initials,temp_c,status,location_id")
    .gte("at", from)
    .lte("at", to)
    .order("at", { ascending: false });

  // ✅ Location scoping (if provided)
  if (locationId) tQ = tQ.eq("location_id", locationId);

  const { data: tempLogs, error: tErr } = await tQ;
  if (tErr) throw new Error(tErr.message);

  const tempRows = (tempLogs ?? []) as any[];
  const totalTemps = tempRows.length;
  const fails = tempRows.filter((r) => String(r.status ?? "").toLowerCase() === "fail").length;

  const failMap = new Map<string, { area: string; item: string; count: number; last: string }>();
  for (const r of tempRows) {
    if (String(r.status ?? "").toLowerCase() !== "fail") continue;

    const area = (r.area ?? "—").toString();
    const item = (r.note ?? "—").toString();
    const key = safeKey(area, item, r.target_key ?? "");
    const ymd = String(r.at ?? "").slice(0, 10) || to;

    const cur = failMap.get(key);
    if (!cur) failMap.set(key, { area, item, count: 1, last: ymd });
    else {
      cur.count += 1;
      if (ymd > cur.last) cur.last = ymd;
    }
  }

  const repeatFailures: FourWeekTempRepeat[] = Array.from(failMap.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count || (b[1].last < a[1].last ? -1 : 1))
    .slice(0, 10)
    .map(([k, v]) => ({
      key: k,
      area: v.area,
      item: v.item,
      count: v.count,
      lastSeenOn: v.last,
    }));

  /* ---------- 2) Cleaning missed ---------- */
  // NOTE: We scope tasks + runs by location if you have location_id columns (you do).
  // If your cleaning_tasks are org-wide templates without location_id, remove the location filter for tasks.
  let taskQ = sb
    .from("cleaning_tasks")
    .select("id,task,area,category,frequency,weekday,month_day,location_id");

  if (locationId) taskQ = taskQ.eq("location_id", locationId);

  const { data: tasksRaw, error: cErr } = await taskQ;
  if (cErr) throw new Error(cErr.message);

  const tasks = (tasksRaw ?? []) as any[];

  let runQ = sb
    .from("cleaning_task_runs")
    .select("task_id,run_on,done_by,location_id")
    .gte("run_on", from)
    .lte("run_on", to);

  if (locationId) runQ = runQ.eq("location_id", locationId);

  const { data: runsRaw, error: rErr } = await runQ;
  if (rErr) throw new Error(rErr.message);

  const runs = (runsRaw ?? []) as any[];
  const runsKey = new Set<string>();
  for (const r of runs) runsKey.add(`${r.task_id}|${String(r.run_on).slice(0, 10)}`);

  const days: string[] = [];
  for (let i = 0; i < 28; i++) days.push(addDays(from, i));

  let dueTotal = 0;
  let completedTotal = 0;

  const missedMap = new Map<
    string,
    { task: string; category: string | null; area: string | null; missed: number; last: string }
  >();

  for (const d of days) {
    const dueToday = tasks.filter((t) =>
      isDueOn(
        {
          frequency: (t.frequency ?? "daily") as Frequency,
          weekday: t.weekday != null ? Number(t.weekday) : null,
          month_day: t.month_day != null ? Number(t.month_day) : null,
        },
        d
      )
    );

    dueTotal += dueToday.length;

    for (const t of dueToday) {
      const key = `${t.id}|${d}`;
      const done = runsKey.has(key);

      if (done) completedTotal += 1;
      else {
        const cur = missedMap.get(String(t.id));
        if (!cur) {
          missedMap.set(String(t.id), {
            task: (t.task ?? "").toString(),
            category: t.category ?? null,
            area: t.area ?? null,
            missed: 1,
            last: d,
          });
        } else {
          cur.missed += 1;
          if (d > cur.last) cur.last = d;
        }
      }
    }
  }

  const missedTotal = clamp(dueTotal - completedTotal, 0, Number.MAX_SAFE_INTEGER);

  const repeatMisses: FourWeekMissedClean[] = Array.from(missedMap.entries())
    .filter(([, v]) => v.missed >= 2)
    .sort((a, b) => b[1].missed - a[1].missed || (b[1].last < a[1].last ? -1 : 1))
    .slice(0, 10)
    .map(([taskId, v]) => ({
      taskId,
      task: v.task || "—",
      category: v.category,
      area: v.area,
      missedCount: v.missed,
      lastMissedOn: v.last,
    }));

  /* ---------- 3) Training drift ---------- */
  // Usually org-wide, not location-specific. Leaving unscoped unless you actually track training per location.
  const today = isoToday();
  const soon = addDays(today, 30);

  let expired = 0;
  let dueSoon = 0;
  let drift: FourWeekTrainingDrift[] = [];

  const { data: trainingsRaw, error: trErr } = await sb
    .from("trainings")
    .select("id,type,expires_on,team_members:staff_id(name,initials)")
    .order("expires_on", { ascending: true });

  if (!trErr) {
    for (const row of (trainingsRaw ?? []) as any[]) {
      const exp = String(row.expires_on ?? "").slice(0, 10);
      if (!exp) continue;

      const staffName = (row.team_members?.name ?? "—").toString();
      const staffInitials = row.team_members?.initials ?? null;
      const type = (row.type ?? "Training").toString();

      if (exp < today) {
        expired += 1;
        drift.push({
          staffName,
          staffInitials,
          type,
          expiresOn: exp,
          daysLeft: -Math.abs(daysBetween(exp, today)),
          status: "expired",
        });
      } else if (exp <= soon) {
        dueSoon += 1;
        drift.push({
          staffName,
          staffInitials,
          type,
          expiresOn: exp,
          daysLeft: daysBetween(today, exp),
          status: "due_soon",
        });
      }
    }

    drift.sort((a, b) =>
      a.status === b.status ? a.daysLeft - b.daysLeft : a.status === "expired" ? -1 : 1
    );
    drift = drift.slice(0, 15);
  }

  const failRate = pct(fails, totalTemps);

  const headline: string[] = [];
  headline.push(`Period: ${from} to ${to} (28 days)`);
  headline.push(`Temperature checks: ${totalTemps} logged, ${fails} fails (${failRate}%).`);
  headline.push(`Cleaning tasks: ${dueTotal} due, ${completedTotal} completed, ${missedTotal} missed.`);
  headline.push(`Training: ${expired} expired, ${dueSoon} due within 30 days.`);

  const recommendations: string[] = [];
  if (repeatFailures.length) {
    recommendations.push(
      "Investigate repeat temperature failures and document corrective actions (equipment, process, retraining)."
    );
  }
  if (repeatMisses.length) {
    recommendations.push(
      "Fix cleaning bottlenecks: reduce task load, reassign ownership, or add reminders."
    );
  }
  if (expired || dueSoon) {
    recommendations.push(
      "Schedule training refreshers now to avoid avoidable non-compliance at inspection."
    );
  }
  if (!recommendations.length) {
    recommendations.push("No major recurring issues detected. Keep doing the basics consistently.");
  }

  return {
    period: { from, to, days: 28, locationId },
    temperature: { total: totalTemps, fails, failRatePct: failRate, repeatFailures },
    cleaning: { dueTotal, completedTotal, missedTotal, repeatMisses },
    training: { expired, dueSoon, drift },
    headline,
    recommendations,
  };
}
