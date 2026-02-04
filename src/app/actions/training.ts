// src/app/actions/training.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * trainings table columns (per your schema):
 * - provider_name text NULL CHECK (provider_name IN ('Highfield','Other') OR provider_name IS NULL)
 *
 * There is NO `provider` column.
 * So we only write provider_name.
 */

export type ProviderChoice = "Highfield" | "Other";

/* ===================== Inputs ===================== */

export type CreateTrainingInput = {
  id?: string;

  teamMemberId?: string | null;

  staffId?: string | null;
  staffInitials?: string | null;

  courseType?: string; // preferred
  courseTitle?: string | null;

  // New (preferred)
  provider?: ProviderChoice; // UI may send this
  providerName?: string | null; // free text for "Other" (NOT stored in provider_name)

  awarded_on: string; // YYYY-MM-DD
  expires_on?: string | null;

  certificate_url?: string | null;
  notes?: string | null;

  // ignored, derived server-side
  orgId?: string | null;

  /* ---- Legacy compatibility (from older TeamManager code) ---- */
  type?: string; // legacy alias for courseType
  provider_other?: string | null; // legacy alias for providerName
};

export type UploadTrainingCertificateInput = {
  file: File;

  teamMemberId?: string | null;
  staffId?: string | null;
  staffInitials?: string | null;

  orgId?: string | null; // ignored
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

function normaliseCourseType(input: CreateTrainingInput): string {
  const ct = (input.courseType ?? "").trim();
  if (ct) return ct;
  return (input.type ?? "").trim();
}

/**
 * DB can ONLY store provider_name in: 'Highfield' | 'Other' | NULL
 * Free-text other provider name must go elsewhere (schema doesn't include a column).
 * We'll append it into notes for now.
 */
function normaliseProviderForDb(input: CreateTrainingInput): {
  provider_name: ProviderChoice;
  otherProviderText: string | null;
} {
  const provider_name: ProviderChoice = input.provider ?? "Highfield";

  const other =
    (input.providerName ?? "").trim() ||
    (input.provider_other ?? "").toString().trim() ||
    "";

  return {
    provider_name,
    otherProviderText: provider_name === "Other" ? (other || null) : null,
  };
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

  const { provider_name, otherProviderText } = normaliseProviderForDb(input);

  // Notes: append other provider text (since schema has no provider_other column)
  const baseNotes = (input.notes ?? "").trim();
  const extra =
    otherProviderText && otherProviderText.toLowerCase() !== "other"
      ? `Provider (other): ${otherProviderText}`
      : null;

  const mergedNotes =
    extra && baseNotes
      ? `${baseNotes}\n${extra}`
      : extra
      ? extra
      : baseNotes || null;

  // Payload matches YOUR table
  const payload: any = {
    org_id,
    team_member_id: input.teamMemberId ?? null,
    staff_id: input.staffId ?? null,

    type: courseType,
    awarded_on,
    expires_on,

    provider_name, // ✅ correct column name
    certificate_url: input.certificate_url ?? null,
    notes: mergedNotes,
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
