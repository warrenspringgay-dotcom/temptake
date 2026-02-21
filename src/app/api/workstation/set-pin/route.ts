// src/app/api/workstation/set-pin/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function cleanPin(pin: unknown) {
  const digits = String(pin ?? "").trim().replace(/\D+/g, "");
  return digits.slice(0, 8);
}

export async function POST(req: Request) {
  // Must be authenticated (owner/admin in UI gates, but server should still validate auth exists)
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

  // Ensure member exists (and belongs to this org/location)
  const { data: member, error: mErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id, active")
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (mErr || !member) {
    return NextResponse.json({ ok: false, reason: "target-not-found" }, { status: 404 });
  }
  if (!(member as any).active) {
    return NextResponse.json({ ok: false, reason: "inactive" }, { status: 403 });
  }

  // Hash PIN using DB function (you already use verify_pin_bcrypt in unlock)
  const { data: hash, error: hErr } = await supabaseAdmin.rpc("hash_pin_bcrypt", {
    p_pin: pin,
  });

  if (hErr || !hash) {
    return NextResponse.json(
      { ok: false, reason: "hash-failed", detail: hErr?.message ?? "no-hash" },
      { status: 400 }
    );
  }

  // Upsert PIN row and reset lockouts
  const nowIso = new Date().toISOString();

  const { error: upErr } = await supabaseAdmin
    .from("team_member_pins")
    .upsert(
      {
        org_id: orgId,
        team_member_id: teamMemberId,
        pin_hash: String(hash),
        failed_attempts: 0,
        locked_until: null,
        updated_at: nowIso,
      },
      { onConflict: "org_id,team_member_id" }
    );

  if (upErr) {
    return NextResponse.json(
      { ok: false, reason: "pin-upsert-failed", detail: upErr.message },
      { status: 400 }
    );
  }

  // ✅ IMPORTANT: make them eligible for workstation PIN operator list
  await supabaseAdmin
    .from("team_members")
    .update({ pin_enabled: true })
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .eq("id", teamMemberId);

  return NextResponse.json({ ok: true });
}