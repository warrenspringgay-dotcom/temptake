import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PLAN_BANDS } from "@/lib/billingTiers";

function maxFromPriceId(priceId: string | null) {
  if (!priceId) return 1; // default: single
  const hit =
    PLAN_BANDS.find((b) => b.stripePriceId === priceId) ||
    PLAN_BANDS.find((b) => b.stripePriceIdAnnual === priceId);
  if (!hit) return 1;
  return hit.maxLocations === Infinity ? 999999 : hit.maxLocations;
}

export async function GET() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ ok: false, reason: "not_authed" }, { status: 401 });
  }

  // org
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr || !prof?.org_id) {
    return NextResponse.json({ ok: false, reason: "no_org" }, { status: 200 });
  }

  const orgId = String(prof.org_id);

  // active locations count
  const { count: activeCount } = await supabaseAdmin
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("active", true);

  // subscription (org scoped)
  const { data: sub } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("status, price_id")
    .eq("org_id", orgId)
    .maybeSingle();

  const status = (sub?.status ?? null) as string | null;
  const priceId = (sub?.price_id ?? null) as string | null;

  const maxLocations = maxFromPriceId(priceId);

  return NextResponse.json({
    ok: true,
    orgId,
    status,
    activeCount: activeCount ?? 0,
    maxLocations,
    atLimit: (activeCount ?? 0) >= maxLocations,
  });
}
