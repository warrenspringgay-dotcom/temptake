// src/app/api/workstation/unlock/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Body = {
  orgId: string;
  locationId: string;
  teamMemberId: string;
  pin: string;
};

function cleanPin(pin: unknown) {
  const s = String(pin ?? "").trim();
  // keep digits only (kitchens love sticky screens and random characters)
  const digits = s.replace(/\D+/g, "");
  return digits.slice(0, 8); // allow 4-8
}

function json(status: number, data: any) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  // Require a logged-in Supabase user (manager session / workstation session)
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return json(401, { ok: false, reason: "no-auth" });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { ok: false, reason: "bad-json" });
  }

  const orgId = String(body.orgId ?? "").trim();
  const locationId = String(body.locationId ?? "").trim();
  const teamMemberId = String(body.teamMemberId ?? "").trim();
  const pin = cleanPin(body.pin);

  if (!orgId || !locationId || !teamMemberId || pin.length < 4) {
    return json(400, { ok: false, reason: "missing" });
  }

  // 1) Ensure team member exists + belongs to org + location and active
  const { data: tm, error: tmErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id, name, initials, role, active, user_id, email")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (tmErr) return json(400, { ok: false, reason: "tm-select-failed", detail: tmErr.message });
  if (!tm || tm.active === false) return json(404, { ok: false, reason: "not-found" });

  // 2) Fetch pin hash + lockout state
  const { data: pinRow, error: pErr } = await supabaseAdmin
    .from("team_member_pins")
    .select("id, pin_hash, failed_attempts, locked_until")
    .eq("org_id", orgId)
    .eq("team_member_id", teamMemberId)
    .maybeSingle();

  if (pErr) return json(400, { ok: false, reason: "pin-select-failed", detail: pErr.message });
  if (!pinRow) return json(400, { ok: false, reason: "no-pin-set" });

  const lockedUntil = pinRow.locked_until ? new Date(pinRow.locked_until).getTime() : 0;
  if (lockedUntil && lockedUntil > Date.now()) {
    return json(423, { ok: false, reason: "locked", lockedUntil: pinRow.locked_until });
  }

  // 3) Verify using Postgres crypt() in a single DB round-trip
  //    We avoid pulling bcrypt libs into node; Postgres does it fine.
  const { data: verified, error: vErr } = await supabaseAdmin.rpc("verify_team_member_pin", {
    p_org_id: orgId,
    p_team_member_id: teamMemberId,
    p_pin: pin,
  });

  if (vErr) return json(400, { ok: false, reason: "verify-failed", detail: vErr.message });

  const ok = !!verified;

  // 4) Update lockout counters
  if (ok) {
    await supabaseAdmin
      .from("team_member_pins")
      .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
      .eq("org_id", orgId)
      .eq("team_member_id", teamMemberId);
  } else {
    const attempts = Number(pinRow.failed_attempts ?? 0) + 1;

    // simple lockout ladder: 5 attempts -> 5 min, 8 -> 30 min
    let locked_until: string | null = null;
    if (attempts >= 8) {
      locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    } else if (attempts >= 5) {
      locked_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    }

    await supabaseAdmin
      .from("team_member_pins")
      .update({
        failed_attempts: attempts,
        locked_until,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("team_member_id", teamMemberId);

    return json(401, { ok: false, reason: "bad-pin", attempts, lockedUntil: locked_until });
  }

  // 5) Return active operator payload (this is what the UI stores)
  return json(200, {
    ok: true,
    operator: {
      teamMemberId: tm.id,
      orgId: tm.org_id,
      locationId: tm.location_id,
      name: tm.name,
      initials: tm.initials,
      role: tm.role,
    },
  });
}
