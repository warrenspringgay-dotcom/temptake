// src/app/actions/training.ts
"use server";

import { createClient } from "@/utils/supabase/server";

function isMissingColumn(e: unknown) {
  const code = (e as any)?.code;
  return code === "42703" || code === "PGRST204";
}

async function getOrgId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const user = data?.user ?? null;
  if (!user) {
    const fallback = process.env.DEFAULT_ORG_ID;
    if (fallback) return fallback;
    throw new Error("Not signed in and DEFAULT_ORG_ID not set");
  }

  const metaOrg = (user.user_metadata as any)?.org_id as string | undefined;
  if (metaOrg) return metaOrg;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr) throw pErr;
  if (profile?.org_id) return profile.org_id;

  const fallback = process.env.DEFAULT_ORG_ID;
  if (fallback) return fallback;

  throw new Error("Missing org_id and DEFAULT_ORG_ID not set");
}

/** Prefer staff_training; fall back to trainings. */
async function detectTrainingTable(supabase: any): Promise<"staff_training" | "trainings"> {
  try {
    const { error } = await supabase.from("staff_training").select("id").limit(1);
    if (!error) return "staff_training";
  } catch {}
  return "trainings";
}

/** ======= Training Types ======= */

export async function listTrainingTypes() {
  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const { data, error } = await supabase
      .from("training_types")
      .select("id, name, validity_days")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    return []; // table not present → allow free text
  }
}

export async function upsertTrainingType(input: { id?: string; name: string; validity_days?: number | null }) {
  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    const { data, error } = await supabase
      .from("training_types")
      .upsert(
        { id: input.id, org_id: orgId, name: input.name, validity_days: input.validity_days ?? null },
        { onConflict: "id" }
      )
      .select("id, name, validity_days")
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    throw new Error("training_types table not available");
  }
}

/** ======= Training Records ======= */

export type TrainingRecordInput = {
  id?: string;
  member_id: string;
  type_id?: string | null;
  type_name?: string | null;
  awarded_on?: string | null;   // YYYY-MM-DD
  expires_on?: string | null;   // may be null
  status?: string | null;       // "OK" | "Due" | "Expired"
  certificate_url?: string | null;
  notes?: string | null;
  active?: boolean | null;
};

export async function listMemberTraining(memberId: string) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTrainingTable(supabase);

  try {
    const { data, error } = await supabase
      .from(table)
      .select("id, member_id, type_id, type_name, awarded_on, expires_on, status, certificate_url, notes, active, created_at")
      .eq("org_id", orgId)
      .eq("member_id", memberId)
      .order("awarded_on", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("org_id", orgId)
      .eq("member_id", memberId);
    if (error) throw error;
    return data ?? [];
  }
}

export async function upsertTraining(rec: TrainingRecordInput) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTrainingTable(supabase);

  const payload: any = { ...rec, org_id: orgId };

  // Prefer explicit column select
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: "id" })
      .select("id, member_id, type_id, type_name, awarded_on, expires_on, status, certificate_url, notes, active, created_at")
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
  }

  // Fallback wildcard
  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTraining(id: string) {
  const supabase = await createClient();
  const orgId = await getOrgId();
  const table = await detectTrainingTable(supabase);

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw error;
}
