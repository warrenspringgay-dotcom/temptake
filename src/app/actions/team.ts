// src/app/actions/team.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

/* ========================== Types (DB mirrors) ========================== */

export type StaffRow = {
  id: string;              // uuid/text
  initials: string;
  name: string;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
};

export type TrainingRow = {
  id: string;              // uuid/text
  staff_id: string;        // FK -> staff.id
  type: string;
  awarded_on: string;      // YYYY-MM-DD
  expires_on: string;      // YYYY-MM-DD
  certificate_url?: string | null;
  notes?: string | null;
};

/* ============================== Helpers =============================== */

const uid = () => Math.random().toString(36).slice(2);

/* ============================== Queries =============================== */

/**
 * List staff and their trainings. Expects:
 * - table `staff`
 * - table `trainings` with staff_id FK
 * Falls back to [] if tables are missing.
 */
export async function listTeam(): Promise<
  Array<StaffRow & { trainings: TrainingRow[] }>
> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: staff, error: e1 } = await supabase
      .from("staff")
      .select("*")
      .order("name", { ascending: true });

    if (e1 || !staff?.length) return [];

    const staffIds = staff.map((s: any) => s.id);
    const { data: trainings, error: e2 } = await supabase
      .from("trainings")
      .select("*")
      .in("staff_id", staffIds);

    const byStaff = new Map<string, TrainingRow[]>();
    (trainings ?? []).forEach((t: any) => {
      const arr = byStaff.get(t.staff_id) ?? [];
      arr.push({
        id: String(t.id),
        staff_id: String(t.staff_id),
        type: String(t.type ?? ""),
        awarded_on: String(t.awarded_on ?? ""),
        expires_on: String(t.expires_on ?? ""),
        certificate_url: t.certificate_url ?? null,
        notes: t.notes ?? null,
      });
      byStaff.set(String(t.staff_id), arr);
    });

    return (staff as any[]).map((s) => ({
      id: String(s.id),
      initials: String(s.initials ?? ""),
      name: String(s.name ?? ""),
      job_title: s.job_title ?? null,
      phone: s.phone ?? null,
      email: s.email ?? null,
      notes: s.notes ?? null,
      active: Boolean(s.active ?? true),
      trainings: byStaff.get(String(s.id)) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Upsert a staff member (insert if new, update if id provided).
 * Returns new/updated id.
 */
export async function upsertStaff(
  draft: Partial<StaffRow> & Pick<StaffRow, "initials" | "name">
): Promise<{ id: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      id: draft.id, // allow DB to generate if undefined
      initials: draft.initials.toUpperCase(),
      name: draft.name,
      job_title: draft.job_title ?? null,
      phone: draft.phone ?? null,
      email: draft.email ?? null,
      notes: draft.notes ?? null,
      active: draft.active ?? true,
    };
    const { data, error } = await supabase
      .from("staff")
      .upsert(payload)
      .select("id")
      .single();

    if (error || !data) return { id: draft.id ?? uid() };
    return { id: String(data.id) };
  } catch {
    return { id: draft.id ?? uid() };
  }
}

export async function deleteStaff(id: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("staff").delete().eq("id", id);
  } catch {
    // ignore
  }
}

/**
 * Upsert a training record. Requires staff_id.
 */
export async function upsertTraining(
  draft: Partial<TrainingRow> & Pick<TrainingRow, "staff_id" | "type" | "awarded_on" | "expires_on">
): Promise<{ id: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const payload = {
      id: draft.id, // allow DB to generate if undefined
      staff_id: draft.staff_id,
      type: draft.type,
      awarded_on: draft.awarded_on,
      expires_on: draft.expires_on,
      certificate_url: draft.certificate_url ?? null,
      notes: draft.notes ?? null,
    };
    const { data, error } = await supabase
      .from("trainings")
      .upsert(payload)
      .select("id")
      .single();

    if (error || !data) return { id: draft.id ?? uid() };
    return { id: String(data.id) };
  } catch {
    return { id: draft.id ?? uid() };
  }
}

export async function deleteTraining(id: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from("trainings").delete().eq("id", id);
  } catch {
    // ignore
  }
}

/** Convenience: list just initials for dropdowns */
export async function listTeamInitials(): Promise<string[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("staff")
      .select("initials")
      .order("initials");

    if (error || !data) return [];
    return (data as Array<{ initials: string }>).map((r) => r.initials || "").filter(Boolean);
  } catch {
    return [];
  }
}
