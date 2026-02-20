// src/app/api/workstation/unlock/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function cleanPin(pin: unknown) {
  // IMPORTANT: keep as STRING (leading zeros matter)
  const digits = String(pin ?? "").trim().replace(/\D+/g, "");
  return digits.slice(0, 8);
}

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(mins: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = String(body.orgId ?? "").trim();
  const locationId = String(body.locationId ?? "").trim();
  const teamMemberId = String(body.teamMemberId ?? "").trim();
  const pin = cleanPin(body.pin);

  if (!orgId || !locationId || !teamMemberId || pin.length < 4) {
    return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
  }

  // Make sure the team member belongs to this org/location and can log in
  const { data: member, error: mErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id, name, initials, role, login_enabled, active")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (mErr || !member) {
    return NextResponse.json({ ok: false, reason: "user-not-found" }, { status: 404 });
  }

  if (member.active === false || member.login_enabled === false) {
    return NextResponse.json({ ok: false, reason: "login-disabled" }, { status: 403 });
  }

  // Load PIN record
  const { data: pinRow, error: pErr } = await supabaseAdmin
    .from("team_member_pins")
    .select("id, pin_hash, failed_attempts, locked_until")
    .eq("org_id", orgId)
    .eq("team_member_id", teamMemberId)
    .maybeSingle();

  if (pErr) {
    return NextResponse.json({ ok: false, reason: "pin-read-failed", detail: pErr.message }, { status: 400 });
  }

  if (!pinRow?.pin_hash) {
    return NextResponse.json({ ok: false, reason: "no-pin-set" }, { status: 400 });
  }

  // Lockout check
  if (pinRow.locked_until) {
    const lockedUntil = new Date(pinRow.locked_until).getTime();
    if (!Number.isNaN(lockedUntil) && lockedUntil > Date.now()) {
      return NextResponse.json({ ok: false, reason: "locked" }, { status: 423 });
    }
  }

  // ✅ Verify PIN correctly (DO NOT rehash and compare)
  const { data: ok, error: vErr } = await supabaseAdmin.rpc("verify_pin_bcrypt", {
    p_pin: pin,
    p_hash: String(pinRow.pin_hash),
  });

  if (vErr) {
    return NextResponse.json({ ok: false, reason: "verify-failed", detail: vErr.message }, { status: 400 });
  }

  const isValid = !!ok;

  if (!isValid) {
    const nextFails = Math.min((pinRow.failed_attempts ?? 0) + 1, 999);

    // After 5 fails, lock for 5 minutes (tune as you like)
    const lock = nextFails >= 5 ? addMinutes(5) : null;

    await supabaseAdmin
      .from("team_member_pins")
      .update({
        failed_attempts: nextFails,
        locked_until: lock,
        updated_at: nowIso(),
      })
      .eq("id", pinRow.id);

    return NextResponse.json({ ok: false, reason: "wrong-pin" }, { status: 401 });
  }

  // Success: reset fails/lock
  await supabaseAdmin
    .from("team_member_pins")
    .update({
      failed_attempts: 0,
      locked_until: null,
      updated_at: nowIso(),
    })
    .eq("id", pinRow.id);

  // Return operator payload expected by WorkstationLockProvider + UI
  return NextResponse.json({
    ok: true,
    operator: {
      teamMemberId: String(member.id),
      orgId,
      locationId,
      name: member.name ? String(member.name) : "Unnamed",
      initials: member.initials ? String(member.initials) : null,
      role: member.role ? String(member.role) : null,
    },
  });
}