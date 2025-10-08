// src/app/actions/team.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

/** Minimal shapes we read from DB */
type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  initials: string | null;
};

type TempLogRow = {
  area?: string | null;
  location?: string | null;
  staff_initials?: string | null;
};

/** Uppercases first character safely */
function firstLetter(s: string | null | undefined): string {
  return (s?.trim().charAt(0) || "").toUpperCase();
}

/**
 * Loads distinct staff initials & locations to prime dropdowns.
 * Combines values from team_members and recent food_temp_logs.
 */
export async function getInitialsAndLocations(): Promise<{
  initials: string[];
  locations: string[];
}> {
  const supabase = await createServerClient();

  // 1) Team initials (preferred source)
  const { data: team, error: teamErr } = await supabase
    .from("team_members")
    .select("id, name, email, initials")
    .limit(500);

  if (teamErr) throw teamErr;

  let initials: string[] = (team as TeamMember[] | null ?? [])
    .map((t: TeamMember) => {
      const fromField = t.initials?.toString().trim().toUpperCase() || "";
      if (fromField) return fromField;
      return firstLetter(t.name) || firstLetter(t.email);
    })
    .filter(Boolean) as string[];

  // 2) Fallback/augment from recent temp logs
  const sevenDaysAgoISO = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: logs, error: logErr } = await supabase
    .from("food_temp_logs")
    .select("area, location, staff_initials")
    .gte("at", sevenDaysAgoISO)
    .limit(1000);

  if (logErr) throw logErr;

  const extraInitials: string[] = (logs as TempLogRow[] | null ?? [])
    .map((r: TempLogRow) =>
      (r.staff_initials ?? "").toString().trim().toUpperCase()
    )
    .filter(Boolean);

  // Merge + de-dupe initials
  initials = Array.from(new Set([...initials, ...extraInitials]));

  // 3) Locations: combine explicit presets from logs (area/location)
  const locations: string[] = Array.from(
    new Set(
      (logs as TempLogRow[] | null ?? [])
        .map((r: TempLogRow) => r.area ?? r.location ?? "")
        .map((s: unknown) => String(s ?? "").trim())
        .filter((s: string): s is string => !!s && s.length > 0)
    )
  );

  return { initials, locations };
}

/**
 * Example helper that returns a minimal team list for UI tables.
 */
export async function listTeamBasic(): Promise<
  Array<{ id: string; name: string; email: string; initials: string }>
> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, email, initials")
    .order("name", { ascending: true })
    .limit(1000);

  if (error) throw error;

  const rows = (data as TeamMember[] | null ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    email: r.email ?? "",
    initials:
      r.initials?.toString().trim().toUpperCase() ||
      firstLetter(r.name) ||
      firstLetter(r.email),
  }));

  return rows;
}
