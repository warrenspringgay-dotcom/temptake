"use server";

import { randomUUID } from "crypto";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type TrainingStatus =
  | "assigned"
  | "invited"
  | "in_progress"
  | "completed"
  | "expired"
  | "cancelled";

export type LicenceState =
  | "not_required"
  | "available"
  | "reserved"
  | "assigned"
  | "consumed"
  | "cancelled";

export type TrainingSyncSource = "manual" | "highfield" | "csv";

export type TrainingLmsSyncStatus =
  | "not_sent"
  | "queued"
  | "enrolled"
  | "completed"
  | "failed";

export type CreateTrainingInput = {
  id?: string;

  teamMemberId: string;

  type: string;
  course_key?: string | null;
  provider_name?: "Highfield" | "Other" | null;

  status?: TrainingStatus;
  assigned_on?: string | null;
  started_on?: string | null;
  completed_on?: string | null;

  awarded_on?: string | null;
  expires_on?: string | null;
  certificate_issue_date?: string | null;
  certificate_expiry_date?: string | null;
  certificate_url?: string | null;

  learner_email?: string | null;
  learner_first_name?: string | null;
  learner_last_name?: string | null;

  external_learner_id?: string | null;
  external_enrolment_id?: string | null;

  licence_state?: LicenceState | null;
  sync_source?: TrainingSyncSource | null;
  last_synced_at?: string | null;

  lms_sync_status?: TrainingLmsSyncStatus | null;
  lms_sync_error?: string | null;
  lms_last_synced_at?: string | null;

  notes?: string | null;
};

export type UploadTrainingCertificateInput = {
  file: File;
};

export type AddLicenceStockInput = {
  course_key: string;
  quantity: number;
};

export type LicencePoolSummary = {
  course_key: string;
  licences_purchased: number;
  licences_reserved: number;
  licences_consumed: number;
  licences_available: number;
};

export type UpdateTrainingLmsSyncInput = {
  trainingId: string;
  lms_sync_status: TrainingLmsSyncStatus;
  external_learner_id?: string | null;
  external_enrolment_id?: string | null;
  lms_sync_error?: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(`${baseISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function safeIsoDate(s?: string | null) {
  if (!s || !s.trim()) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function safeIsoTimestamp(s?: string | null) {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function deriveAwardedOn(input: CreateTrainingInput) {
  return (
    safeIsoDate(input.awarded_on) ??
    safeIsoDate(input.completed_on) ??
    (input.status === "completed" ? todayISO() : null)
  );
}

function deriveCompletedOn(input: CreateTrainingInput) {
  return (
    safeIsoDate(input.completed_on) ??
    safeIsoDate(input.awarded_on) ??
    (input.status === "completed" ? todayISO() : null)
  );
}

function deriveAssignedOn(input: CreateTrainingInput) {
  return (
    safeIsoDate(input.assigned_on) ??
    (input.status && input.status !== "completed" ? todayISO() : null)
  );
}

function deriveExpiresOn(input: CreateTrainingInput, awardedOn: string | null) {
  const explicit =
    safeIsoDate(input.expires_on) ?? safeIsoDate(input.certificate_expiry_date);
  if (explicit) return explicit;
  if (!awardedOn) return null;
  return addDaysISO(awardedOn, 365 * 2);
}

function normalizeStatus(input: CreateTrainingInput): TrainingStatus {
  if (input.status) return input.status;
  return input.awarded_on || input.completed_on ? "completed" : "assigned";
}

function deriveLicenceState(
  explicit: LicenceState | null | undefined,
  status: TrainingStatus
): LicenceState {
  if (explicit) return explicit;

  switch (status) {
    case "completed":
    case "expired":
      return "consumed";
    case "cancelled":
      return "cancelled";
    case "assigned":
    case "invited":
    case "in_progress":
      return "assigned";
    default:
      return "not_required";
  }
}

export async function uploadTrainingCertificateServer(
  input: UploadTrainingCertificateInput
) {
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const bucket =
    process.env.NEXT_PUBLIC_TRAINING_BUCKET || "training-certificates";

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

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const url = pub?.publicUrl || "";

  return { url, path };
}

export async function createTrainingServer(input: CreateTrainingInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const me = await supabase.auth.getUser();
  const userId = me.data.user?.id ?? null;

  if (!input.teamMemberId?.trim()) {
    throw new Error("Team member ID is required.");
  }

  if (!input.type?.trim()) {
    throw new Error("Training type is required.");
  }

  const status = normalizeStatus(input);
  const provider_name = input.provider_name === "Other" ? "Other" : "Highfield";

  const assigned_on = deriveAssignedOn(input);
  const completed_on = deriveCompletedOn(input);
  const awarded_on = deriveAwardedOn(input);
  const expires_on = deriveExpiresOn(input, awarded_on);

  const payload: Record<string, unknown> = {
    org_id,
    created_by: userId,
    team_member_id: input.teamMemberId,

    type: input.type.trim(),
    course_key: input.course_key?.trim() || null,
    provider_name,

    status,
    assigned_on,
    started_on: safeIsoDate(input.started_on),
    completed_on,

    awarded_on,
    expires_on,

    certificate_issue_date:
      safeIsoDate(input.certificate_issue_date) ?? awarded_on,
    certificate_expiry_date:
      safeIsoDate(input.certificate_expiry_date) ?? expires_on,
    certificate_url: input.certificate_url?.trim() || null,

    learner_email: input.learner_email?.trim().toLowerCase() || null,
    learner_first_name: input.learner_first_name?.trim() || null,
    learner_last_name: input.learner_last_name?.trim() || null,

    external_learner_id: input.external_learner_id?.trim() || null,
    external_enrolment_id: input.external_enrolment_id?.trim() || null,

    licence_state: deriveLicenceState(input.licence_state, status),
    sync_source: input.sync_source ?? "manual",
    last_synced_at: safeIsoTimestamp(input.last_synced_at),

    lms_sync_status: input.lms_sync_status ?? null,
    lms_sync_error: input.lms_sync_error?.trim() || null,
    lms_last_synced_at: safeIsoTimestamp(input.lms_last_synced_at),

    notes: input.notes?.trim() || null,
  };

  if (status === "expired" && !payload.completed_on && awarded_on) {
    payload.completed_on = awarded_on;
  }

  if (input.id) payload.id = input.id;

  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) throw new Error(`[trainings.upsert] ${error.message}`);

  return { id: data.id as string };
}

export async function archiveTrainingServer(trainingId: string) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");
  if (!trainingId?.trim()) throw new Error("Training ID is required.");

  const { error } = await supabase
    .from("trainings")
    .update({ archived_at: new Date().toISOString() })
    .eq("org_id", org_id)
    .eq("id", trainingId);

  if (error) throw new Error(`[trainings.archive] ${error.message}`);

  return { ok: true };
}

export async function unarchiveTrainingServer(trainingId: string) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");
  if (!trainingId?.trim()) throw new Error("Training ID is required.");

  const { error } = await supabase
    .from("trainings")
    .update({ archived_at: null })
    .eq("org_id", org_id)
    .eq("id", trainingId);

  if (error) throw new Error(`[trainings.unarchive] ${error.message}`);

  return { ok: true };
}

export async function addLicenceStockServer(input: AddLicenceStockInput) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");

  const course_key = input.course_key?.trim();
  const quantity = Number(input.quantity);

  if (!course_key) throw new Error("Course key is required.");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  const { data: existing, error: existingErr } = await supabase
    .from("training_licence_pools")
    .select("id, licences_purchased")
    .eq("org_id", org_id)
    .eq("provider_name", "Highfield")
    .eq("course_key", course_key)
    .maybeSingle();

  if (existingErr) {
    throw new Error(`[licence_pools.select] ${existingErr.message}`);
  }

  if (existing?.id) {
    const nextPurchased = Number(existing.licences_purchased ?? 0) + quantity;

    const { error: updateErr } = await supabase
      .from("training_licence_pools")
      .update({ licences_purchased: nextPurchased })
      .eq("id", existing.id)
      .eq("org_id", org_id);

    if (updateErr) {
      throw new Error(`[licence_pools.update] ${updateErr.message}`);
    }
  } else {
    const { error: insertErr } = await supabase
      .from("training_licence_pools")
      .insert({
        org_id,
        provider_name: "Highfield",
        course_key,
        licences_purchased: quantity,
        licences_reserved: 0,
        licences_consumed: 0,
      });

    if (insertErr) {
      throw new Error(`[licence_pools.insert] ${insertErr.message}`);
    }
  }

  return { ok: true };
}

export async function listLicencePoolsServer(): Promise<LicencePoolSummary[]> {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) return [];

  const { data: pools, error: poolsErr } = await supabase
    .from("training_licence_pools")
    .select("course_key, licences_purchased")
    .eq("org_id", org_id)
    .eq("provider_name", "Highfield");

  if (poolsErr) {
    throw new Error(`[licence_pools.select] ${poolsErr.message}`);
  }

  const { data: trainings, error: trainingsErr } = await supabase
    .from("trainings")
    .select("course_key,status,licence_state,archived_at")
    .eq("org_id", org_id);

  if (trainingsErr) {
    throw new Error(`[trainings.select] ${trainingsErr.message}`);
  }

  const purchaseMap = new Map<string, number>();
  const reservedMap = new Map<string, number>();
  const consumedMap = new Map<string, number>();

  for (const row of pools ?? []) {
    const key = String((row as any).course_key ?? "").trim();
    const qty = Number((row as any).licences_purchased ?? 0);
    if (!key) continue;
    purchaseMap.set(key, qty);
  }

  for (const row of trainings ?? []) {
    const archived_at = (row as any).archived_at ?? null;
    if (archived_at) continue;

    const key = String((row as any).course_key ?? "").trim();
    if (!key) continue;

    const licence_state = (row as any).licence_state ?? null;
    const status = (row as any).status ?? null;

    const isConsumed =
      licence_state === "consumed" ||
      status === "completed" ||
      status === "expired";

    const isReserved =
      licence_state === "reserved" ||
      licence_state === "assigned" ||
      status === "assigned" ||
      status === "invited" ||
      status === "in_progress";

    if (isConsumed) {
      consumedMap.set(key, (consumedMap.get(key) ?? 0) + 1);
      continue;
    }

    if (isReserved) {
      reservedMap.set(key, (reservedMap.get(key) ?? 0) + 1);
    }
  }

  const allKeys = new Set<string>([
    ...purchaseMap.keys(),
    ...reservedMap.keys(),
    ...consumedMap.keys(),
  ]);

  return Array.from(allKeys)
    .sort()
    .map((course_key) => {
      const licences_purchased = purchaseMap.get(course_key) ?? 0;
      const licences_reserved = reservedMap.get(course_key) ?? 0;
      const licences_consumed = consumedMap.get(course_key) ?? 0;
      const licences_available =
        licences_purchased - licences_reserved - licences_consumed;

      return {
        course_key,
        licences_purchased,
        licences_reserved,
        licences_consumed,
        licences_available,
      };
    });
}

export async function updateTrainingLmsSyncServer(
  input: UpdateTrainingLmsSyncInput
) {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();
  if (!org_id) throw new Error("No org selected.");
  if (!input.trainingId?.trim()) throw new Error("Training ID is required.");

  const payload = {
    lms_sync_status: input.lms_sync_status,
    external_learner_id: input.external_learner_id?.trim() || null,
    external_enrolment_id: input.external_enrolment_id?.trim() || null,
    lms_sync_error: input.lms_sync_error?.trim() || null,
    lms_last_synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("trainings")
    .update(payload)
    .eq("org_id", org_id)
    .eq("id", input.trainingId);

  if (error) throw new Error(`[trainings.lms_sync] ${error.message}`);

  return { ok: true };
}

export const saveTrainingServer = createTrainingServer;