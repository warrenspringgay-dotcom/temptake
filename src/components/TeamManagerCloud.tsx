// src/components/TeamManagerCloud.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

/** Shape coming from your UI */
export type TrainingInput = {
  id?: string;                 // existing training id when editing
  staffId?: string | null;     // direct selection from a staff picker (optional)
  staffInitials?: string | null; // or initials typed/selected (optional)
  type: string;                // e.g. "Level 2", "Induction", etc.
  awarded_on: string;          // "yyyy-mm-dd"
  expires_on?: string | null;  // "yyyy-mm-dd" (optional, will default if missing)
  certificate_url?: string | null;
  notes?: string | null;
};

/** Add N days to an ISO yyyy-mm-dd date (safe for DATE columns). */
function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ensure a row exists in public.staff and return its id.
 * - If staffId is passed, verify it exists.
 * - Else, use initials to find or create a staff row.
 */
// Ensure a row exists in public.staff and return its id.
// If staffId is provided, we verify it; otherwise we resolve by initials.
// When creating, we must include a non-null 'name' to satisfy NOT NULL.
async function ensureStaffExists(opts: {
  staffId?: string | null;
  staffInitials?: string | null;
}): Promise<string> {
  const { staffId, staffInitials } = opts;

  // 1) Explicit id
  if (staffId) {
    const { data, error } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .maybeSingle();
    if (error) throw new Error(`Failed to verify staff: ${error.message}`);
    if (!data?.id) throw new Error("Selected staff not found.");
    return data.id;
  }

  // 2) Resolve by initials (find or create)
  const ini = (staffInitials ?? "").trim().toUpperCase();
  if (!ini) throw new Error("No staff selected: provide staffId or staffInitials.");

  // 2a) Already in staff?
  const { data: existing, error: findErr } = await supabase
    .from("staff")
    .select("id")
    .eq("initials", ini)
    .maybeSingle();
  if (findErr) throw new Error(`Failed to lookup staff by initials: ${findErr.message}`);
  if (existing?.id) return existing.id;

  // 2b) Try get a real name from team_members by initials
  let nameToUse: string | null = null;
  try {
    const { data: tm } = await supabase
      .from("team_members")
      .select("name")
      .eq("initials", ini)
      .maybeSingle();
    nameToUse = (tm?.name ?? null)?.toString().trim() || null;
  } catch {
    // ignore
  }

  // 2c) Create minimal staff row with a guaranteed name (NOT NULL)
  const { data: created, error: createErr } = await supabase
    .from("staff")
    .insert({
      initials: ini,
      name: nameToUse ?? ini, // <- ensure NOT NULL is satisfied
    })
    .select("id")
    .single();

  if (createErr) throw new Error(`Failed to create staff: ${createErr.message}`);
  if (!created?.id) throw new Error("Failed to create staff (no id returned).");
  return created.id;
}


  // 2) Resolve by initials (find) or create minimal row
  const ini = staffInitials?.trim().toUpperCase() ?? "";
  if (!ini) throw new Error("No staff selected: provide staffId or staffInitials.");

  const { data, error } = await supabase
    .from("staff")
    .select("id, initials")
    .eq("initials", ini)
    .maybeSingle();

  if (error) throw new Error(`Failed to lookup staff by initials: ${error.message}`);
  if (data?.id) return data.id;

  // 3) Not found → create minimal staff row
  const { data: created, error: createErr } = await supabase
    .from("staff")
    .insert({ initials: ini }) // add any other defaults your table allows
    .select("id")
    .single();

  if (createErr) throw new Error(`Failed to create staff: ${createErr.message}`);
  if (!created?.id) throw new Error("Failed to create staff (no id returned).");
  return created.id;
}

/**
 * Upsert a training row **with a valid staff_id** (FK to public.staff).
 * Matches your `public.trainings` schema (id, staff_id, type, awarded_on, expires_on, certificate_url, notes).
 * Does **not** send created_by/updated_at/org_id since your table doesn't have them.
 */
export async function upsertTrainingCloud(input: TrainingInput): Promise<{ id: string }> {
  // 1) Make sure we have a real staff.id
  const staff_id = await ensureStaffExists({
    staffId: input.staffId,
    staffInitials: input.staffInitials,
  });

  // 2) Compute expiry if not supplied (default 12 months = 365 days)
  const expires_on =
    input.expires_on && input.expires_on.trim().length > 0
      ? input.expires_on
      : addDaysISO(input.awarded_on, 365);

  // 3) Build payload that matches your columns exactly
  const payload = {
    id: input.id, // allow undefined for insert
    staff_id,
    type: input.type,
    awarded_on: input.awarded_on,
    expires_on,
    certificate_url: input.certificate_url ?? null,
    notes: input.notes ?? null,
  };

  // 4) Upsert by primary key id (if provided). If id is undefined, it inserts.
  const { data, error } = await supabase
    .from("trainings")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    // surface precise FK / constraint errors to the caller
    throw new Error(`[trainings.upsert] ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Upsert succeeded but no id was returned from trainings.");
  }

  return { id: data.id };
}

/** Convenience wrapper */
export async function saveTraining(form: TrainingInput) {
  return upsertTrainingCloud(form);
}

/* ------------------------------------------------------------------ */
/* Minimal client UI (safe to keep or expand).                         */

export default function TeamManagerCloud() {
  const [initials, setInitials] = useState("");
  const [type, setType] = useState("");
  const [awarded, setAwarded] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      await saveTraining({
        staffInitials: initials,
        type,
        awarded_on: awarded,
      });
      setMsg("Saved ✓");
      setInitials("");
      setType("");
    } catch (e: any) {
      setMsg(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Initials</label>
          <input
            className="w-full rounded-xl border px-3 py-2 uppercase"
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            placeholder="WS"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Level 2 / Induction"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Awarded on</label>
          <input
            type="date"
            className="w-full rounded-xl border px-3 py-2"
            value={awarded}
            onChange={(e) => setAwarded(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={saving || !initials || !type}
          onClick={onSave}
          className="rounded-2xl px-4 py-2 font-medium text-white disabled:bg-gray-400 bg-black hover:bg-gray-900"
        >
          {saving ? "Saving…" : "Save training"}
        </button>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
    </div>
  );
}
