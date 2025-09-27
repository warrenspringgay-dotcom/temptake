// src/components/DashboardKpis.tsx
// Server Component (no "use client")

import ComplianceKpis from "@/components/ComplianceKpis";
import { createServerClient } from "@/lib/supabaseServer";

/** Count rows in a table with a date column within [from, to], scoped to created_by = user.id */
async function countDateRange(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  dateCol: string,
  userId: string,
  fromISO: string,
  toISO: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte(dateCol, fromISO)
    .lte(dateCol, toISO);

  if (error) throw error;
  return count ?? 0;
}

/** Try a sequence of (table, dateCol) options; return first successful count */
async function tryCountAny(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  fromISO: string,
  toISO: string,
  candidates: Array<{ table: string; col: string }>
): Promise<number> {
  for (const c of candidates) {
    try {
      return await countDateRange(supabase, c.table, c.col, userId, fromISO, toISO);
    } catch {
      // try next candidate
    }
  }
  return 0;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardKpis() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in (shouldn’t happen on your dashboard), show zeros gracefully
  if (!user) {
    return (
      <ComplianceKpis
        trainingExpiringSoon={0}
        allergenExpired={0}
        allergenExpiringSoon={0}
      />
    );
  }

  // Date window for “expiring soon (14d)”
  const today = new Date();
  const in14 = new Date();
  in14.setDate(today.getDate() + 14);

  const todayISO = isoDay(today); // YYYY-MM-DD
  const in14ISO = isoDay(in14);

  // 1) TRAINING expiring in 14 days
  // We try common schemas:
  //  - team_members.training_expires :: date
  //  - trainings.expires_at          :: date/timestamptz
  const trainingExpiringSoon = await tryCountAny(
    supabase,
    user.id,
    todayISO,
    in14ISO,
    [
      { table: "team_members", col: "training_expires" },
      { table: "trainings", col: "expires_at" },
    ]
  );

  // 2) ALLERGEN REVIEW (expired / expiring in 14d)
  // Table: allergen_review (one row per org/user). Compute next_due = last_reviewed + interval_days.
  let allergenExpired = 0;
  let allergenExpiringSoon = 0;

  try {
    const { data: arows } = await supabase
      .from("allergen_review")
      .select("*")
      .eq("created_by", user.id)
      .limit(5);

    const rows = (arows ?? []) as Array<{
      last_reviewed: string | null;
      interval_days: number | null;
    }>;

    for (const r of rows) {
      const last = r.last_reviewed ? new Date(r.last_reviewed) : null;
      const interval = r.interval_days ?? 0;

      if (!last || interval <= 0) continue;

      const nextDue = new Date(last);
      nextDue.setDate(nextDue.getDate() + interval);

      if (nextDue < today) {
        allergenExpired += 1;
      } else if (nextDue <= in14) {
        allergenExpiringSoon += 1;
      }
    }
  } catch {
    // no table yet or not accessible → leave zeros
  }

  return (
    <ComplianceKpis
      trainingExpiringSoon={trainingExpiringSoon}
      allergenExpired={allergenExpired}
      allergenExpiringSoon={allergenExpiringSoon}
    />
  );
}
