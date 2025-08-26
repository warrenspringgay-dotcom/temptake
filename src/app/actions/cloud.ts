// src/app/actions/cloud.ts
import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import type { CookieOptions } from "@supabase/ssr";

/** Types exposed to client */
export type TempLogInput = {
  timeISO: string;
  item: string;
  tempC: number;
  category?: string | null;
  location?: string | null;
  pass?: boolean | null;
  initials?: string | null;
  correctiveAction?: string | null;
  notes?: string | null;
};

export type TempLogRow = {
  id: string;
  org_id: string;
  time_iso: string;
  item: string;
  category: string | null;
  location: string | null;
  temp_c: number;
  pass: boolean;
  initials: string | null;
  corrective_action: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

/** Internal: Next cookie‑backed server client */
async function serverClient() {
  const store = await nextCookies();
  return supabaseServer({
    get: (name: string) => store.get(name)?.value ?? null,
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    // Use params via void to avoid eslint "unused" warnings
    set: (name: string, value: string, options: CookieOptions) => {
      void name; void value; void options;
    },
    remove: (name: string, options: CookieOptions) => {
      void name; void options;
    },
  });
}

async function requireAuthOrgAndStaff() {
  const sb = await serverClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Not signed in");

  const { data: profile } = await sb
    .from("profiles")
    .select("org_id, email")
    .eq("id", auth.user.id)
    .maybeSingle();

  const orgId = profile?.org_id ?? null;
  if (!orgId) throw new Error("Profile/org missing");

  // Require staff membership (active) by user_id OR email
  const email = auth.user.email ?? profile?.email ?? "";
  const { data: staff } = await sb
    .from("staff_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("active", true)
    .or(`user_id.eq.${auth.user.id},email.eq.${email}`)
    .limit(1);

  if (!staff || staff.length === 0) {
    throw new Error("You must be added to Team as active staff before logging temperatures.");
  }

  return { sb, userId: auth.user.id as string, orgId: orgId as string };
}

/** Can current user log? (for gating UI) */
export async function canCurrentUserLog(): Promise<{ ok: boolean; reason?: string }> {
  "use server";
  try {
    await requireAuthOrgAndStaff();
    return { ok: true };
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : "Not allowed";
    return { ok: false, reason };
  }
}

/** Expose org_id for client features (e.g., realtime filters) */
export async function getOrgInfo(): Promise<{ orgId: string | null }> {
  "use server";
  const sb = await serverClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { orgId: null };
  const { data: profile } = await sb.from("profiles").select("org_id").eq("id", auth.user.id).maybeSingle();
  return { orgId: profile?.org_id ?? null };
}

/** Insert a temperature log — requires staff membership */
export async function pushTempLog(log: TempLogInput) {
  "use server";
  const { sb, userId, orgId } = await requireAuthOrgAndStaff();

  const row = {
    org_id: orgId,
    time_iso: log.timeISO,
    item: log.item,
    category: log.category ?? null,
    location: log.location ?? null,
    temp_c: log.tempC,
    pass: log.pass ?? true,
    initials: log.initials ?? null,
    corrective_action: log.correctiveAction ?? null,
    notes: log.notes ?? null,
    created_by: userId,
  };

  const { error } = await sb.from("temp_logs").insert(row);
  if (error) throw error;

  return { ok: true as const };
}

/** Fetch logs in date window (YYYY-MM-DD) */
export async function fetchTempLogs(fromISO?: string, toISO?: string) {
  "use server";
  const { sb, orgId } = await requireAuthOrgAndStaff();

  const start = fromISO ?? new Date().toISOString().slice(0, 10);
  const end = toISO ?? start;

  const { data, error } = await sb
    .from("temp_logs")
    .select("id, org_id, time_iso, item, category, location, temp_c, pass, initials, corrective_action, notes, created_by, created_at")
    .gte("time_iso", `${start}T00:00:00Z`)
    .lt("time_iso", `${end}T23:59:59.999Z`)
    .eq("org_id", orgId)
    .order("time_iso", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TempLogRow[];
}

/** Delete a log (RLS should enforce org) */
export async function deleteTempLog(id: string) {
  "use server";
  const { sb } = await requireAuthOrgAndStaff();
  const { error } = await sb.from("temp_logs").delete().eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}
