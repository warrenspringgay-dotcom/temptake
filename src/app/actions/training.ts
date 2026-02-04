// src/app/actions/training.ts
"use server";

import { randomUUID } from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CreateTrainingInput = {
  id?: string;

  teamMemberId: string;

  // DB columns
  type: string; // course title shown to inspector
  course_key?: string | null; // we’ll use for course type OR “Other provider name”
  provider_name?: "Highfield" | "Other" | null;

  awarded_on: string; // YYYY-MM-DD
  expires_on?: string | null;

  certificate_url?: string | null;
  notes?: string | null;
};

export type UploadTrainingCertificateInput = {
  file: File;
};

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function safeIsoDate(s: string) {
  // Accepts YYYY-MM-DD; if invalid, fallback to today.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(d.toISOString().slice(0, 10)).toISOString().slice(0, 10);
}

/**
 * Upload a certificate to Storage using the service role (no RLS drama).
 * Returns { url, path } where url is a public URL (bucket should be public),
 * otherwise it will still upload but the link may not be accessible without signed URLs.
 */
export async function uploadTrainingCertificateServer(input: UploadTrainingCertificateInput) {
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const bucket = process.env.NEXT_PUBLIC_TRAINING_BUCKET || "training-certificates";

  const file = input.file;
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const original = file.name || "certificate";
  const ext = original.includes(".") ? original.split(".").pop() : "bin";
  const safeExt = (ext || "bin").toLowerCase().slice(0, 10);

  const path = `${org_id}/${randomUUID()}.${safeExt}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (upErr) throw new Error(`[storage.upload] ${upErr.message}`);

  // Public URL (works if bucket is public)
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

  const url = pub?.publicUrl;
  if (!url) {
    // Upload succeeded but no public URL (bucket likely private).
    // Still return path so you can switch to signed URL later if needed.
    return { url: "", path };
  }

  return { url, path };
}

/**
 * Create/Update a training row for a team member.
 * Uses the normal server supabase (respects auth), sets org_id explicitly.
 */
export async function createTrainingServer(input: CreateTrainingInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const me = await supabase.auth.getUser();
  const userId = me.data.user?.id ?? null;

  const awarded_on = safeIsoDate(input.awarded_on);
  const expires_on =
    input.expires_on && input.expires_on.trim()
      ? input.expires_on
      : addDaysISO(awarded_on, 365);

  // Provider enum only: Highfield | Other (DB constraint)
  const provider_name =
    input.provider_name === "Other" ? "Other" : "Highfield";

  const payload: any = {
    org_id,
    created_by: userId,
    team_member_id: input.teamMemberId,
    type: input.type,
    course_key: input.course_key ?? null,
    provider_name,
    awarded_on,
    expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  if (input.id) payload.id = input.id;

  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[trainings.upsert] ${error.message}`);

  return { id: data.id as string };
}

// Backwards-compatible alias if you previously used this name somewhere
export const saveTrainingServer = createTrainingServer;
