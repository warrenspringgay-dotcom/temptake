// src/app/actions/incidents.ts
"use server";

import { getServerSupabaseAction } from "@/lib/supabaseServer";

export type IncidentPayload = {
  happened_on: string; // YYYY-MM-DD
  location_id: string; // required (your table is NOT NULL)
  type?: string | null;
  details?: string | null;
  immediate_action?: string | null;
  preventive_action?: string | null;
  created_by?: string | null; // initials
};

export async function logIncident(payload: IncidentPayload): Promise<{
  ok: boolean;
  id?: string;
  message?: string;
}> {
  try {
    const supabase = await getServerSupabaseAction();

    // If you're using profiles/org_id with RLS, this must pass RLS
    const { data, error } = await supabase.from("incidents").insert(payload).select("id").single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Failed to log incident." };
  }
}

export async function listIncidents(args: {
  location_id: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  limit?: number;
}): Promise<{
  ok: boolean;
  rows: Array<{
    id: string;
    happened_on: string;
    type: string | null;
    details: string | null;
    immediate_action: string | null;
    preventive_action: string | null;
    created_by: string | null;
    created_at: string;
  }>;
  message?: string;
}> {
  try {
    const supabase = await getServerSupabaseAction();

    let q = supabase
      .from("incidents")
      .select("id,happened_on,type,details,immediate_action,preventive_action,created_by,created_at")
      .eq("location_id", args.location_id)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (args.from) q = q.gte("happened_on", args.from);
    if (args.to) q = q.lte("happened_on", args.to);

    q = q.limit(args.limit ?? 200);

    const { data, error } = await q;
    if (error) return { ok: false, rows: [], message: error.message };

    return { ok: true, rows: (data ?? []) as any };
  } catch (e: any) {
    return { ok: false, rows: [], message: e?.message ?? "Failed to load incidents." };
  }
}
