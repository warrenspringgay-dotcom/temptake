// src/app/api/workstation/unlock/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";
import { setOperatorCookie } from "@/lib/workstationServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function cleanPin(pin: unknown) {
  const digits = String(pin ?? "").trim().replace(/\D+/g, "");
  return digits.slice(0, 8);
}

function ttlSeconds() {
  const hours = Number(process.env.WORKSTATION_SESSION_TTL_HOURS ?? "12");
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 12;
  return Math.floor(safe * 60 * 60);
}

export async function POST(req: Request) {
  // Must be authenticated (manager session can exist, fine)
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orgId = String(body.orgId ?? "").trim();
  const locationId = String(body.locationId ?? "").trim();
  const teamMemberId = String(body.teamMemberId ?? "").trim();
  const pin = cleanPin(body.pin);

  if (!orgId || !locationId || !teamMemberId || pin.length < 4) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  // Ensure target member exists and is allowed for PIN (active + login_enabled)
  const { data: member, error: mErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id, name, initials, role, active, login_enabled")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (mErr || !member) return NextResponse.json({ ok: false, reason: "target-not-found" }, { status: 404 });
  if (!(member as any).active) return NextResponse.json({ ok: false, reason: "inactive" }, { status: 403 });
  if (!(member as any).login_enabled) return NextResponse.json({ ok: false, reason: "pin-not-enabled" }, { status: 403 });

  // Load PIN hash row
  const { data: pinRow, error: pErr } = await supabaseAdmin
    .from("team_member_pins")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("org_id", orgId)
    .eq("team_member_id", teamMemberId)
    .maybeSingle();

  if (pErr) return NextResponse.json({ ok: false, reason: "pin-fetch-failed" }, { status: 400 });
  if (!pinRow?.pin_hash) return NextResponse.json({ ok: false, reason: "no-pin-set" }, { status: 400 });

  const lockedUntil = pinRow.locked_until ? new Date(String(pinRow.locked_until)).getTime() : 0;
  if (lockedUntil && lockedUntil > Date.now()) {
    return NextResponse.json({ ok: false, reason: "locked" }, { status: 423 });
  }

  // Verify PIN using bcrypt compare rpc
  const { data: ok, error: vErr } = await supabaseAdmin.rpc("verify_pin_bcrypt", {
    p_pin: pin,
    p_hash: String(pinRow.pin_hash),
  });

  if (vErr) return NextResponse.json({ ok: false, reason: "verify-failed", detail: vErr.message }, { status: 400 });

  if (!ok) {
    const attempts = Number(pinRow.failed_attempts ?? 0) + 1;
    const lock = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null; // 5 min lock
    await supabaseAdmin
      .from("team_member_pins")
      .update({ failed_attempts: attempts, locked_until: lock })
      .eq("org_id", orgId)
      .eq("team_member_id", teamMemberId);

    return NextResponse.json({ ok: false, reason: attempts >= 5 ? "locked" : "wrong-pin" }, { status: 401 });
  }

  // Success: reset attempts
  await supabaseAdmin
    .from("team_member_pins")
    .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("team_member_id", teamMemberId);

  // Create operator session token + cookie
  const token = crypto.randomBytes(32).toString("hex");
  const maxAge = ttlSeconds();
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString();

  await supabaseAdmin.from("workstation_operator_sessions").insert({
    org_id: orgId,
    location_id: locationId,
    team_member_id: teamMemberId,
    role: (member as any).role ?? "staff",
    token,
    expires_at: expiresAt,
  });

  await setOperatorCookie(token, maxAge);

  return NextResponse.json({
    ok: true,
    operator: {
      teamMemberId: String((member as any).id),
      orgId,
      locationId,
      name: (member as any).name ?? "—",
      initials: (member as any).initials ?? null,
      role: (member as any).role ?? "staff",
    },
  });
}