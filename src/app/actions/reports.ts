// src/app/actions/reports.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";
import { TARGET_PRESETS } from "@/lib/temp-constants";

export type InstantAuditRow = {
  section: "temps";
  id: string;
  at: string;       // ISO
  title: string;    // e.g. "Kitchen — Chicken curry"
  details?: string; // e.g. "5.2°C (target: Ambient) (pass)"
};

export type InstantAudit90d = {
  range: { from: string; to: string };
  rows: InstantAuditRow[];
};

function computeStatus(tempC: number | null, presetKey?: string | null) {
  if (tempC == null || !presetKey) return null;
  const map = new Map(TARGET_PRESETS.map(p => [String(p.key), p]));
  const preset = map.get(String(presetKey));
  if (!preset) return null;
  const { minC, maxC } = preset;
  if (minC != null && tempC < minC) return "fail";
  if (maxC != null && tempC > maxC) return "fail";
  return "pass";
}

export async function getInstantAudit90d(): Promise<InstantAudit90d> {
  const supabase = await supabaseServer();
  const orgId = await getOrgId();

  const to = new Date();
  const from = new Date(to.getTime() - 89 * 864e5);

  const { data, error } = await supabase
    .from("temp_logs")
    .select("id,date,created_at,staff_initials,location,item,temp_c,target_key")
    .eq("org_id", orgId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows: InstantAuditRow[] = (data ?? []).map((r: any) => {
    const atISO = r.date
      ? new Date(`${r.date}T00:00:00Z`).toISOString()
      : new Date(r.created_at ?? Date.now()).toISOString();

    const status = computeStatus(r.temp_c ?? null, r.target_key ?? null);
    const preset = TARGET_PRESETS.find(p => String(p.key) === String(r.target_key));
    const targetLabel = preset ? preset.label : "—";
    const tempTxt = r.temp_c != null ? `${Number(r.temp_c).toFixed(1)}°C` : "—";
    const statusTxt = status ? ` (${status})` : "";

    return {
      section: "temps",
      id: r.id,
      at: atISO,
      title: `${r.location ?? "—"} — ${r.item ?? "—"}`,
      details: `${tempTxt} (target: ${targetLabel})${statusTxt}`,
    };
  });

  return { range: { from: from.toISOString(), to: to.toISOString() }, rows };
}

/**
 * Custom range report. Pass nothing to use the last 30 days.
 * Or pass an object with { from?: string; to?: string } (ISO strings).
 */
export async function getCustomReport(
  range?: { from?: string; to?: string }
): Promise<InstantAuditRow[]> {
  const supabase = await supabaseServer();
  const orgId = await getOrgId();

  const to = range?.to ? new Date(range.to) : new Date();
  const from = range?.from ? new Date(range.from) : new Date(to.getTime() - 30 * 864e5);

  const { data, error } = await supabase
    .from("temp_logs")
    .select("id,date,created_at,location,item,temp_c,target_key")
    .eq("org_id", orgId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const atISO = r.date
      ? new Date(`${r.date}T00:00:00Z`).toISOString()
      : new Date(r.created_at ?? Date.now()).toISOString();

    const status = computeStatus(r.temp_c ?? null, r.target_key ?? null);
    const preset = TARGET_PRESETS.find(p => String(p.key) === String(r.target_key));
    const targetLabel = preset ? preset.label : "—";
    const tempTxt = r.temp_c != null ? `${Number(r.temp_c).toFixed(1)}°C` : "—";
    const statusTxt = status ? ` (${status})` : "";

    return {
      section: "temps",
      id: r.id,
      at: atISO,
      title: `${r.location ?? "—"} — ${r.item ?? "—"}`,
      details: `${tempTxt} (target: ${targetLabel})${statusTxt}`,
    };
  });
}
