// src/app/api/billing/ensure-trial/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Ensures a billing_subscriptions row exists for the user's active org.
 * - If no org found -> { ok:false, reason:"no_org" }
 * - If exists -> { ok:true, created:false }
 * - If created -> { ok:true, created:true }
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: false }, { status: 200 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, reason: "not_authed" }, { status: 401 });
  }

  // --- Find org_id robustly (because humans love inconsistency) ---
  let orgId: string | null = null;

  // 1) Try profiles.active_org_id or profiles.org_id
  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("active_org_id, org_id")
      .eq("id", user.id)
      .maybeSingle();

    orgId =
      (prof as any)?.active_org_id ??
      (prof as any)?.org_id ??
      null;
  } catch {}

  // 2) Fallback to user_orgs (if you have it)
  if (!orgId) {
    try {
      const { data: uo } = await supabase
        .from("user_orgs")
        .select("org_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      orgId = (uo?.[0] as any)?.org_id ?? null;
    } catch {}
  }

  if (!orgId) {
    return NextResponse.json({ ok: false, reason: "no_org" }, { status: 200 });
  }

  // --- If subscription exists, we're done ---
  const { data: existing } = await supabase
    .from("billing_subscriptions")
    .select("id,status")
    .eq("org_id", orgId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, created: false, orgId }, { status: 200 });
  }

  // --- Create a trial row ---
  // Choose your trial length. I'm defaulting to 14 days.
  const now = new Date();
  const trialEnds = addDays(now, 14).toISOString();

  const insertPayload = {
    org_id: orgId,
    user_id: user.id,
    status: "trialing",
    trial_ends_at: trialEnds,
    cancel_at_period_end: false,
  };

  const { error: insErr } = await supabase
    .from("billing_subscriptions")
    .insert(insertPayload);

  if (insErr) {
    return NextResponse.json(
      { ok: false, reason: "insert_failed", message: insErr.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, created: true, orgId }, { status: 200 });
}
