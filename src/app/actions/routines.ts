// src/app/actions/routines.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type TempRoutine = {
  id: string;
  name: string | null;
  location: string | null;
  item: string | null;
  target_key: string | null;
  active: boolean;
  last_used_at?: string | null;
};

async function getUidOrg() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("You are signed out.");

  // Try to find org; OK if not found
  let orgId: string | null = null;
  try {
    const { data: tm } = await supabase
      .from("team_members")
      .select("org_id, owner_id")
      .eq("user_id", user.id)
      .maybeSingle();
    orgId = tm?.org_id ?? tm?.owner_id ?? null;
  } catch {}

  return { supabase, uid: user.id, orgId };
}

/** helper: if an org_id filter errors (column missing), retry without it */
function isMissingOrgCol(e: any) {
  const msg = e?.message || e?.toString?.() || "";
  return /org_id/i.test(msg);
}

export async function listRoutines(): Promise<TempRoutine[]> {
  const { supabase, uid, orgId } = await getUidOrg();

  try {
    let q = supabase
      .from("temp_routines")
      .select("id, name, location, item, target_key, active, last_used_at")
      .eq("created_by", uid)
      .order("last_used_at", { ascending: false })
      .limit(200);

    // try org filter if we have an orgId
    if (orgId != null) q = q.eq("org_id", orgId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TempRoutine[];
  } catch (e: any) {
    if (!isMissingOrgCol(e)) throw new Error(`routine load failed: ${e.message || e}`);

    // retry WITHOUT org filter
    const { data, error } = await supabase
      .from("temp_routines")
      .select("id, name, location, item, target_key, active, last_used_at")
      .eq("created_by", uid)
      .order("last_used_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(`routine load failed: ${error.message}`);
    return (data ?? []) as TempRoutine[];
  }
}

export async function createRoutine(payload: {
  name: string;
  location?: string;
  item?: string;
  target_key: string;
}) {
  const { supabase, uid, orgId } = await getUidOrg();

  // prefer to send org_id if column exists; if not, the insert will still work
  const base: any = {
    created_by: uid,
    name: payload.name || null,
    location: payload.location ?? null,
    item: payload.item ?? null,
    target_key: payload.target_key || null,
    active: true,
    last_used_at: new Date().toISOString(),
  };
  if (orgId != null) base.org_id = orgId;

  const { error } = await supabase.from("temp_routines").insert(base);
  if (error && !isMissingOrgCol(error)) throw new Error(`[createRoutine] ${error.message}`);
}

export async function updateRoutine(
  id: string,
  patch: Partial<Pick<TempRoutine, "name" | "location" | "item" | "target_key" | "active">>
) {
  const { supabase, uid, orgId } = await getUidOrg();

  // first attempt: include org filter if we have one
  try {
    let q = supabase
      .from("temp_routines")
      .update({ ...patch, last_used_at: new Date().toISOString() })
      .eq("id", id)
      .eq("created_by", uid);
    if (orgId != null) q = q.eq("org_id", orgId);

    const { error } = await q;
    if (error) throw error;
  } catch (e: any) {
    if (!isMissingOrgCol(e)) throw new Error(`[updateRoutine] ${e.message || e}`);

    // retry without org filter
    const { error } = await supabase
      .from("temp_routines")
      .update({ ...patch, last_used_at: new Date().toISOString() })
      .eq("id", id)
      .eq("created_by", uid);

    if (error) throw new Error(`[updateRoutine] ${error.message}`);
  }
}

export async function deleteRoutine(id: string) {
  const { supabase, uid, orgId } = await getUidOrg();

  try {
    let q = supabase.from("temp_routines").delete().eq("id", id).eq("created_by", uid);
    if (orgId != null) q = q.eq("org_id", orgId);
    const { error } = await q;
    if (error) throw error;
  } catch (e: any) {
    if (!isMissingOrgCol(e)) throw new Error(`[deleteRoutine] ${e.message || e}`);

    // retry without org filter
    const { error } = await supabase
      .from("temp_routines")
      .delete()
      .eq("id", id)
      .eq("created_by", uid);

    if (error) throw new Error(`[deleteRoutine] ${error.message}`);
  }
}
