// src/app/actions/tempLogs.ts
"use server";

/**
 * Server actions for temperature logs.
 * In guest mode (no auth / no Supabase client), these calls become safe no-ops
 * so the UI can still function using localStorage.
 */

export type TempLogInput = {
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

export type TempLogRow = {
  id: string;
  date: string | null;
  staff_initials: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  temp_c: number | null;
  status: "pass" | "fail" | null;
};

// If you have a Supabase server client, import it here.
// Keep this import even if you haven't created the helper yet; the try/catch handles it.
let createClient: (() => any) | undefined;
try {
  // Adjust the path to your actual helper if different:
  // e.g. import { createClient as _create } from "@/utils/supabase/server";
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@/utils/supabase/server");
  createClient = mod.createClient;
} catch {
  createClient = undefined;
}

async function getOrgIdSafe(): Promise<{ supabase: any | null; orgId: string | null }> {
  try {
    const supabase = typeof createClient === "function" ? createClient() : null;
    const getUser = supabase?.auth?.getUser;
    if (!getUser) return { supabase: null, orgId: null };

    const { data, error } = await getUser();
    if (error || !data?.user) return { supabase, orgId: null };

    const orgId = (data.user.user_metadata as any)?.org_id ?? null;
    return { supabase, orgId };
  } catch {
    return { supabase: null, orgId: null };
  }
}

/** Return staff initials if available; otherwise empty list (guest mode). */
export async function listStaffInitials(): Promise<string[]> {
  const { supabase, orgId } = await getOrgIdSafe();
  if (!supabase || !orgId) {
    // Guest mode: let the client merge local TeamManagerLocal initials.
    return [];
  }
  // Example query – adjust table/columns to your schema.
  const { data, error } = await supabase
    .from("team_members")
    .select("initials")
    .eq("org_id", orgId)
    .eq("active", true);

  if (error || !data) return [];
  return (data as Array<{ initials: string | null }>).map((r) => (r.initials ?? "").toUpperCase()).filter(Boolean);
}

/** List logs for the current org. Guest mode returns an empty list (client uses localStorage). */
export async function listTempLogs(): Promise<TempLogRow[]> {
  const { supabase, orgId } = await getOrgIdSafe();
  if (!supabase || !orgId) return [];

  const { data, error } = await supabase
    .from("temp_logs")
    .select("id,date,staff_initials,location,item,target_key,temp_c,status")
    .eq("org_id", orgId)
    .order("date", { ascending: false })
    .limit(500);

  if (error || !data) return [];
  return data as TempLogRow[];
}

/** Upsert a log. Guest mode: no-op (client already saved locally). */
export async function upsertTempLog(input: TempLogInput): Promise<{ id: string | null }> {
  const { supabase, orgId } = await getOrgIdSafe();
  if (!supabase || !orgId) return { id: null };

  const payload = { ...input, org_id: orgId };
  const { data, error } = await supabase
    .from("temp_logs")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) return { id: null };
  return { id: data.id as string };
}

/** Delete a log by id. Guest mode: no-op. */
export async function deleteTempLog(id: string): Promise<void> {
  const { supabase, orgId } = await getOrgIdSafe();
  if (!supabase || !orgId) return;

  await supabase.from("temp_logs").delete().eq("id", id).eq("org_id", orgId);
}
