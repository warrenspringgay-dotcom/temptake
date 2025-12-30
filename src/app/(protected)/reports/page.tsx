'use server';

import { requireUser } from '@/lib/requireUser';
import { createServerClient } from '@/lib/supabaseServer';

/**
 * Four-Weekly Review (SFBB-inspired)
 * Rolling 28-day window. Surfaces:
 * - Repeat temperature failures
 * - Missed cleaning tasks
 * - Staff training drift (expired / expiring soon)
 *
 * Designed to feel "automatic" and "smart" with no extra user work.
 */

/* =========================
   Helpers
========================= */

function getOrgIdFromUser(user: { user_metadata?: any; app_metadata?: any; id: string }) {
  // Matches the approach used elsewhere in your codebase.
  return user.user_metadata?.org_id ?? user.app_metadata?.org_id ?? user.id;
}

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

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10; // 0.1%
}

/** Mon=1..Sun=7 (matches your cleaning logic) */
function dow1to7(ymd: string) {
  const date = new Date(ymd);
  return ((date.getDay() + 6) % 7) + 1;
}
function dom(ymd: string) {
  return new Date(ymd).getDate();
}

type Frequency = 'daily' | 'weekly' | 'monthly';

function isDueOn(
  t: { frequency: Frequency; weekday: number | null; month_day: number | null },
  ymd: string
) {
  switch (t.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return t.weekday === dow1to7(ymd);
    case 'monthly':
      return t.month_day === dom(ymd);
    default:
      return false;
  }
}

function safeKey(...parts: Array<string | null | undefined>) {
  return parts.map((p) => (p ?? '').trim().toLowerCase()).join('|');
}

/* =========================
   Base types
========================= */

export type LogRow = {
  id: string;
  at: string; // ISO timestamp/date
  routine_id: string | null;
  routine_item_id: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  staff_initials: string | null;
  temp_c: number | null;
  status: string | null;
  org_id?: string;
  location_id?: string | null;
};

export async function listLogs(opts: { from?: string; to?: string; limit?: number; locationId?: string } = {}) {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);

  const sb = await createServerClient();

  let q = sb
    .from('food_temp_logs')
    .select('id,at,routine_id,routine_item_id,area,note,target_key,staff_initials,temp_c,status,org_id,location_id')
    .eq('org_id', orgId)
    .order('at', { ascending: false });

  if (opts.locationId) q = q.eq('location_id', opts.locationId);
  if (opts.from) q = q.gte('at', opts.from);
  if (opts.to) q = q.lte('at', opts.to);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LogRow[];
}

/* =========================
   Four-week review types
========================= */

export type FourWeekTempRepeat = {
  key: string;
  area: string;
  item: string;
  count: number;
  lastSeenOn: string; // yyyy-mm-dd
};

export type FourWeekMissedClean = {
  taskId: string;
  task: string;
  category: string | null;
  area: string | null;
  missedCount: number;
  lastMissedOn: string; // yyyy-mm-dd
};

export type FourWeekTrainingDrift = {
  staffName: string;
  staffInitials: string | null;
  type: string;
  expiresOn: string;
  daysLeft: number;
  status: 'expired' | 'due_soon';
};

export type FourWeekSummary = {
  period: {
    from: string;
    to: string;
    days: number; // 28
  };

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

/* =========================
   Four-week review generator
========================= */

export async function getFourWeeklyReview(opts: { to?: string; locationId?: string } = {}): Promise<FourWeekSummary> {
  const user = await requireUser();
  const orgId = getOrgIdFromUser(user);
  const sb = await createServerClient();

  const to = (opts.to ?? isoToday()).slice(0, 10);
  const from = addDays(to, -27); // inclusive = 28 days window

  // ---------- 1) Temperature trends ----------
  const { data: tempLogs, error: tErr } = await sb
    .from('food_temp_logs')
    .select('id,at,area,note,target_key,staff_initials,temp_c,status,location_id')
    .eq('org_id', orgId)
    .gte('at', from)
    .lte('at', to)
    .order('at', { ascending: false });

  if (tErr) throw new Error(tErr.message);

  const tempFiltered = (opts.locationId
    ? (tempLogs ?? []).filter((r: any) => String(r.location_id ?? '') === String(opts.locationId))
    : (tempLogs ?? [])) as any[];

  const totalTemps = tempFiltered.length;
  const fails = tempFiltered.filter((r) => String(r.status ?? '').toLowerCase() === 'fail').length;

  // repeat failures by (area + note + target_key)
  const failMap = new Map<string, { area: string; item: string; count: number; last: string }>();
  for (const r of tempFiltered) {
    if (String(r.status ?? '').toLowerCase() !== 'fail') continue;
    const area = (r.area ?? '—').toString();
    const item = (r.note ?? '—').toString();
    const key = safeKey(area, item, r.target_key ?? '');
    const ymd = String(r.at ?? '').slice(0, 10) || to;

    const cur = failMap.get(key);
    if (!cur) {
      failMap.set(key, { area, item, count: 1, last: ymd });
    } else {
      cur.count += 1;
      if (ymd > cur.last) cur.last = ymd;
    }
  }

  const repeatFailures: FourWeekTempRepeat[] = Array.from(failMap.entries())
    .filter(([, v]) => v.count >= 2) // repeat = 2+ in 4 weeks
    .sort((a, b) => b[1].count - a[1].count || (b[1].last < a[1].last ? -1 : 1))
    .slice(0, 10)
    .map(([k, v]) => ({
      key: k,
      area: v.area,
      item: v.item,
      count: v.count,
      lastSeenOn: v.last,
    }));

  // ---------- 2) Cleaning missed ----------
  // Fetch tasks (org + optional location)
  const { data: allTasks, error: cErr } = await sb
    .from('cleaning_tasks')
    .select('id,task,area,category,frequency,weekday,month_day,location_id')
    .eq('org_id', orgId);

  if (cErr) throw new Error(cErr.message);

  const tasks = (opts.locationId
    ? (allTasks ?? []).filter((t: any) => String(t.location_id ?? '') === String(opts.locationId))
    : (allTasks ?? [])) as any[];

  // Runs for range
  const { data: runsRaw, error: rErr } = await sb
    .from('cleaning_task_runs')
    .select('task_id,run_on,done_by,location_id')
    .eq('org_id', orgId)
    .gte('run_on', from)
    .lte('run_on', to);

  if (rErr) throw new Error(rErr.message);

  const runs = (opts.locationId
    ? (runsRaw ?? []).filter((r: any) => String(r.location_id ?? '') === String(opts.locationId))
    : (runsRaw ?? [])) as any[];

  const runsKey = new Set<string>();
  for (const r of runs) runsKey.add(`${r.task_id}|${String(r.run_on).slice(0, 10)}`);

  // Iterate each day and compute due + missed
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
          frequency: (t.frequency ?? 'daily') as Frequency,
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
            task: (t.task ?? '').toString(),
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
      task: v.task || '—',
      category: v.category,
      area: v.area,
      missedCount: v.missed,
      lastMissedOn: v.last,
    }));

  // ---------- 3) Training drift ----------
  // Expired: expires_on < today
  // Due soon: expires_on within 30 days
  const today = isoToday();
  const soon = addDays(today, 30);

  // Best-effort join: trainings -> staff
  // If your schema differs, this fails soft (no drift rather than nuking the report).
  const { data: trainingsRaw, error: trErr } = await sb
    .from('trainings')
    .select('id,type,expires_on,staff:staff_id(name,initials,org_id)')
    .order('expires_on', { ascending: true });

  const trainings = trErr ? [] : (trainingsRaw ?? []);

  const drift: FourWeekTrainingDrift[] = [];
  let expired = 0;
  let dueSoon = 0;

  for (const row of trainings as any[]) {
    const staffOrg = row.staff?.org_id ?? null;
    if (staffOrg && String(staffOrg) !== String(orgId)) continue;

    const exp = String(row.expires_on ?? '').slice(0, 10);
    if (!exp) continue;

    const staffName = (row.staff?.name ?? '—').toString();
    const staffInitials = row.staff?.initials ?? null;
    const type = (row.type ?? 'Training').toString();

    if (exp < today) {
      expired += 1;
      drift.push({
        staffName,
        staffInitials,
        type,
        expiresOn: exp,
        daysLeft: -Math.abs(daysBetween(exp, today)),
        status: 'expired',
      });
    } else if (exp <= soon) {
      dueSoon += 1;
      drift.push({
        staffName,
        staffInitials,
        type,
        expiresOn: exp,
        daysLeft: daysBetween(today, exp),
        status: 'due_soon',
      });
    }
  }

  const driftTop = drift
    .sort((a, b) =>
      a.status === b.status ? a.daysLeft - b.daysLeft : a.status === 'expired' ? -1 : 1
    )
    .slice(0, 15);

  // ---------- Headline + recs ----------
  const failRate = pct(fails, totalTemps);

  const headline: string[] = [];
  headline.push(`Period: ${from} to ${to} (28 days)`);
  headline.push(`Temperature checks: ${totalTemps} logged, ${fails} fails (${failRate}%).`);
  headline.push(`Cleaning tasks: ${dueTotal} due, ${completedTotal} completed, ${missedTotal} missed.`);
  headline.push(`Training: ${expired} expired, ${dueSoon} due within 30 days.`);

  const recommendations: string[] = [];
  if (repeatFailures.length) {
    recommendations.push(
      'Investigate repeat temperature failures and document corrective actions (equipment, process, retraining).'
    );
  }
  if (repeatMisses.length) {
    recommendations.push(
      'Fix the cleaning rota bottlenecks: reduce task load, reassign ownership, or add reminders.'
    );
  }
  if (expired || dueSoon) {
    recommendations.push('Schedule training refreshers now to avoid avoidable non-compliance at inspection.');
  }
  if (!recommendations.length) {
    recommendations.push('No major recurring issues detected. Keep doing the basics consistently.');
  }

  return {
    period: { from, to, days: 28 },
    temperature: { total: totalTemps, fails, failRatePct: failRate, repeatFailures },
    cleaning: { dueTotal, completedTotal, missedTotal, repeatMisses },
    training: { expired, dueSoon, drift: driftTop },
    headline,
    recommendations,
  };
}

/**
 * Converts summary to compact line-based content.
 * Used by the PDF API route so we don’t maintain two versions of “what the report says”.
 */
export function fourWeekSummaryToLines(s: FourWeekSummary): string[] {
  const lines: string[] = [];

  lines.push('TempTake | Four-Weekly Review (SFBB)');
  lines.push('');
  lines.push(`Period: ${s.period.from} to ${s.period.to} (${s.period.days} days)`);
  lines.push('');

  lines.push('1) Temperature checks');
  lines.push(`- Total logged: ${s.temperature.total}`);
  lines.push(`- Failures: ${s.temperature.fails} (${s.temperature.failRatePct}%)`);
  if (s.temperature.repeatFailures.length) {
    lines.push('- Repeat failures (2+):');
    for (const r of s.temperature.repeatFailures.slice(0, 8)) {
      lines.push(`  • ${r.area} | ${r.item} → ${r.count} fails (last ${r.lastSeenOn})`);
    }
  } else {
    lines.push('- Repeat failures: none detected');
  }
  lines.push('');

  lines.push('2) Cleaning');
  lines.push(`- Due: ${s.cleaning.dueTotal}`);
  lines.push(`- Completed: ${s.cleaning.completedTotal}`);
  lines.push(`- Missed: ${s.cleaning.missedTotal}`);
  if (s.cleaning.repeatMisses.length) {
    lines.push('- Repeat misses (2+):');
    for (const r of s.cleaning.repeatMisses.slice(0, 8)) {
      const where = [r.area, r.category].filter(Boolean).join(' | ');
      lines.push(
        `  • ${r.task}${where ? ` (${where})` : ''} → missed ${r.missedCount} (last ${r.lastMissedOn})`
      );
    }
  } else {
    lines.push('- Repeat misses: none detected');
  }
  lines.push('');

  lines.push('3) Training drift');
  lines.push(`- Expired: ${s.training.expired}`);
  lines.push(`- Due soon (30d): ${s.training.dueSoon}`);
  if (s.training.drift.length) {
    lines.push('- Items:');
    for (const r of s.training.drift.slice(0, 10)) {
      const who = r.staffInitials ? `${r.staffName} (${r.staffInitials})` : r.staffName;
      const st = r.status === 'expired' ? 'EXPIRED' : `due in ${r.daysLeft}d`;
      lines.push(`  • ${who} | ${r.type} → ${st} (exp ${r.expiresOn})`);
    }
  } else {
    lines.push('- Training drift: none detected');
  }
  lines.push('');

  lines.push('Recommendations');
  for (const rec of s.recommendations) lines.push(`- ${rec}`);

  return lines;
}
