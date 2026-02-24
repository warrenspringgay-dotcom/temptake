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

  // ✅ Loosen location requirement:
  // allow member.location_id NULL or matching the provided locationId.
  const { data: member, error: mErr } = await supabaseAdmin
    .from("team_members")
    .select("id, org_id, location_id, active")
    .eq("org_id", orgId)
    .eq("id", teamMemberId)
    .maybeSingle();

  if (mErr || !member) {
    return NextResponse.json({ ok: false, reason: "target-not-found" }, { status: 404 });
  }
  if (!(member as any).active) {
    return NextResponse.json({ ok: false, reason: "inactive" }, { status: 403 });
  }
  const memberLoc = (member as any).location_id as string | null;
  if (memberLoc && memberLoc !== locationId) {
    return NextResponse.json({ ok: false, reason: "wrong-location" }, { status: 403 });
  }

  const { data: hash, error: hErr } = await supabaseAdmin.rpc("hash_pin_bcrypt", {
    p_pin: pin,
  });

  if (hErr || !hash) {
    return NextResponse.json(
      { ok: false, reason: "hash-failed", detail: hErr?.message ?? "no-hash" },
      { status: 400 }
    );
  }

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

  // ✅ Make eligible for operator list (no location filter)
  await supabaseAdmin
    .from("team_members")
    .update({ pin_enabled: true })
    .eq("org_id", orgId)
    .eq("id", teamMemberId);

  return NextResponse.json({ ok: true });
}