// src/app/actions/training.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * This file intentionally supports BOTH:
 *  - "new" payload shape: courseType / providerName
 *  - "legacy" payload shape: type / provider_other
 *
 * So TeamManager.tsx doesn't need changing to compile.
 */

export type ProviderChoice = "Highfield" | "Other";

/* ===================== Inputs ===================== */

// New shape (preferred)
export type CreateTrainingInput = {
  id?: string;

  teamMemberId?: string | null;

  staffId?: string | null;
  staffInitials?: string | null;

  courseType?: string; // preferred
  courseTitle?: string | null;

  provider?: ProviderChoice; // preferred
  providerName?: string | null; // preferred (when provider === "Other")

  awarded_on: string; // YYYY-MM-DD
  expires_on?: string | null;

  certificate_url?: string | null;
  notes?: string | null;

  // UI sometimes passes this; we ignore and derive server-side
  orgId?: string | null;

  /* ---- Legacy compatibility ---- */
  type?: string; // legacy alias for courseType
  provider_other?: string | null; // legacy alias for providerName
};

// Upload input (keep simple)
export type UploadTrainingCertificateInput = {
  file: File;

  teamMemberId?: string | null;
  staffId?: string | null;
  staffInitials?: string | null;

  orgId?: string | null; // ignored, derived server-side
};

export type UploadTrainingCertificateResult = {
  ok: boolean;
  url: string | null;
  path: string | null;
  message?: string | null;
};

/* ===================== Helpers ===================== */

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function safeExtFromMime(mime: string | undefined) {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf")) return "pdf";
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "bin";
}

function normaliseProvider(input: CreateTrainingInput): {
  provider: ProviderChoice;
  providerName: string | null;
} {
  // provider defaults to Highfield
  const provider: ProviderChoice = input.provider ?? "Highfield";

  // providerName can come from new field OR legacy provider_other
  const rawOther =
    (input.providerName ?? "").trim() ||
    (input.provider_other ?? "").toString().trim() ||
    "";

  // If provider is Other, keep providerName; else null it
  const providerName = provider === "Other" ? (rawOther || null) : null;

  return { provider, providerName };
}

function normaliseCourseType(input: CreateTrainingInput): string {
  // courseType preferred, fallback to legacy "type"
  const ct = (input.courseType ?? "").trim();
  if (ct) return ct;

  const legacy = (input.type ?? "").trim();
  return legacy;
}

/* ===================== Upload (Storage) ===================== */

export async function uploadTrainingCertificateServer(
  input: UploadTrainingCertificateInput
): Promise<UploadTrainingCertificateResult> {
  try {
    const org_id = await getActiveOrgIdServer();
    if (!org_id) {
      return { ok: false, url: null, path: null, message: "No org selected." };
    }

    const file = input.file;
    if (!file) {
      return { ok: false, url: null, path: null, message: "No file provided." };
    }

    const maxMB = 15;
    if (file.size > maxMB * 1024 * 1024) {
      return {
        ok: false,
        url: null,
        path: null,
        message: `File too large (max ${maxMB}MB).`,
      };
    }

    const ext = safeExtFromMime(file.type);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    const who =
      input.teamMemberId ??
      input.staffId ??
      (input.staffInitials ? input.staffInitials.trim().toUpperCase() : "unknown");

    // If your bucket name is different, change it here.
    const bucket = "training-certificates";
    const path = `${org_id}/${who}/${stamp}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (upErr) {
      return { ok: false, url: null, path: null, message: upErr.message };
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const url = data?.publicUrl ?? null;

    return { ok: true, url, path, message: null };
  } catch (e: any) {
    return { ok: false, url: null, path: null, message: e?.message ?? "Upload failed." };
  }
}

/* ===================== Save training row ===================== */

export async function createTrainingServer(input: CreateTrainingInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const courseType = normaliseCourseType(input);
  if (!courseType) throw new Error("Course type is required.");

  const awarded_on = (input.awarded_on ?? "").trim();
  if (!awarded_on) throw new Error("Awarded date is required.");

  const expires_on =
    input.expires_on && input.expires_on.trim()
      ? input.expires_on.trim()
      : addDaysISO(awarded_on, 365);

  const { provider, providerName } = normaliseProvider(input);

  // Payload (match your DB columns)
  const payload: any = {
    org_id,

    team_member_id: input.teamMemberId ?? null,
    staff_id: input.staffId ?? null,

    // trainings.type is your course name column
    type: courseType,

    // Optional fields: keep if they exist in your DB, remove if not
    course_title: input.courseTitle?.trim() || null,

    // These MUST satisfy trainings_provider_chk
    provider,
    provider_name: providerName,

    awarded_on,
    expires_on,

    certificate_url: input.certificate_url ?? null,
    notes: input.notes?.trim() || null,
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

/** Backwards-compatible alias (older code imported this name). */
export const saveTrainingServer = createTrainingServer;

