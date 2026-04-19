"use client";

import { supabase } from "@/lib/supabaseBrowser";

export type LocationDayStatus = {
  isOpen: boolean;
  source: "default" | "weekly_schedule" | "closure_override";
  note: string | null;
};

function getDow1to7(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  return ((date.getDay() + 6) % 7) + 1;
}

export async function getLocationDayStatus(
  orgId: string,
  locationId: string | null,
  dateISO: string
): Promise<LocationDayStatus> {
  if (!locationId) {
    return {
      isOpen: true,
      source: "default",
      note: null,
    };
  }

  try {
    const { data: closure, error: closureErr } = await supabase
      .from("location_closures")
      .select("id, reason")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("date", dateISO)
      .maybeSingle();

    if (!closureErr && closure) {
      return {
        isOpen: false,
        source: "closure_override",
        note: closure.reason ? String(closure.reason) : "Marked closed for today.",
      };
    }
  } catch {
    // ignore and fall through
  }

  const weekday0to6 = new Date(`${dateISO}T00:00:00`).getDay();
  const weekday1to7 = getDow1to7(dateISO);

  try {
    const { data: scheduleRows, error: scheduleErr } = await supabase
      .from("location_opening_days")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .in("weekday", [weekday1to7, weekday0to6]);

    if (!scheduleErr && Array.isArray(scheduleRows) && scheduleRows.length > 0) {
      const exact1to7 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday1to7
      );
      const exact0to6 = scheduleRows.find(
        (r: any) => Number(r.weekday) === weekday0to6
      );
      const row = exact1to7 ?? exact0to6 ?? scheduleRows[0];

      const isOpen = row?.is_open !== false;

      let note: string | null = null;
      if (!isOpen) {
        note = "Closed by weekly opening days.";
      } else if (row?.opens_at && row?.closes_at) {
        note = `${String(row.opens_at).slice(0, 5)}–${String(row.closes_at).slice(0, 5)}`;
      }

      return {
        isOpen,
        source: "weekly_schedule",
        note,
      };
    }
  } catch {
    // ignore and fall through
  }

  return {
    isOpen: true,
    source: "default",
    note: null,
  };
}

export async function countOpenDaysInRange(args: {
  orgId: string;
  locationId: string | null;
  startISO: string;
  endISO: string;
}): Promise<number> {
  const { orgId, locationId, startISO, endISO } = args;

  let count = 0;
  let cursor = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  while (cursor <= end) {
    const cursorISO = cursor.toISOString().slice(0, 10);
    const status = await getLocationDayStatus(orgId, locationId, cursorISO);

    if (status.isOpen) count += 1;

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

export async function calculateOpenDaySignoffStreak(args: {
  orgId: string;
  locationId: string | null;
  signedOffDays: Set<string>;
  startFromISO: string;
  maxLookbackDays?: number;
}): Promise<number> {
  const {
    orgId,
    locationId,
    signedOffDays,
    startFromISO,
    maxLookbackDays = 365,
  } = args;

  if (!signedOffDays.size) return 0;

  let streak = 0;
  let cursorISO = startFromISO;

  for (let i = 0; i < maxLookbackDays; i += 1) {
    const status = await getLocationDayStatus(orgId, locationId, cursorISO);

    if (!status.isOpen) {
      const d = new Date(`${cursorISO}T00:00:00`);
      d.setDate(d.getDate() - 1);
      cursorISO = d.toISOString().slice(0, 10);
      continue;
    }

    if (!signedOffDays.has(cursorISO)) {
      break;
    }

    streak += 1;

    const d = new Date(`${cursorISO}T00:00:00`);
    d.setDate(d.getDate() - 1);
    cursorISO = d.toISOString().slice(0, 10);
  }

  return streak;
}