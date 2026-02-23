// src/app/api/onboarding/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function deriveInitials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "ME";

  if (s.includes("@")) {
    const local = s.split("@")[0] ?? "";
    return local.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ME";
  }

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 4);
}

/**
* Read auth from either:
* - Cookie session (SSR auth)
* - Authorization Bearer token (client localStorage session)
*/
async function getUserFromRequest(req: NextRequest) {
  const supabase = await getServerSupabase();

  // 1) cookie session
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
  if (!cookieErr && cookieAuth?.user) return cookieAuth.user;

  // 2) bearer token
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    const { data: tokenAuth, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenAuth?.user) return tokenAuth.user;
  }

  return null;
}

async function ensureLocation(orgId: string, locationName?: string) {
  const name = (locationName ?? "").trim() || "Main Location";

  // try existing first (avoid duplicates if user double-clicks)
  const { data: existing, error: selErr } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("org_id", orgId)
    .ilike("name", name)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return String(existing.id);

  const { data: created, error: insErr } = await supabaseAdmin
    .from("locations")
    .insert({ org_id: orgId, name, active: true })
    .select("id")
    .single();

  if (insErr) {
    // race-safe retry
    const { data: existing2, error: selErr2 } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", name)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (selErr2) throw insErr;
    if (existing2?.id) return String(existing2.id);
    throw insErr;
  }

  return String(created.id);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const ownerName = String(body.ownerName ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    const locationName = String(body.locationName ?? "").trim();

    const email = (user.email ?? "").trim().toLowerCase();
    const displayName =
      ownerName || (email ? email.split("@")[0] : "") || businessName || "Owner";
    const initials = deriveInitials(displayName || email || "Owner");

    // 1) Create org (ADMIN)
    // NOTE: keep this minimal to avoid schema mismatch.
    const orgInsert: any = {
      name: businessName || "My Business",
      active: true,
    };

    const { data: orgRow, error: orgErr } = await supabaseAdmin
      .from("orgs")
      .insert(orgInsert)
      .select("id")
      .single();

    if (orgErr) {
      return NextResponse.json(
        { ok: false, reason: "org-create-failed", detail: orgErr.message },
        { status: 400 }
      );
    }

    const orgId = String(orgRow.id);

    // 2) Link user to org in user_orgs (ADMIN)  ✅ this is what was failing
    // Ensure you have a UNIQUE constraint on (user_id, org_id) for onConflict to work.
    const { error: uoErr } = await supabaseAdmin
      .from("user_orgs")
      .upsert(
        {
          user_id: user.id,
          org_id: orgId,
          role: "owner",
          active: true,
        },
        { onConflict: "user_id,org_id" }
      );

    if (uoErr) {
      return NextResponse.json(
        { ok: false, reason: "user-org-link-failed", detail: uoErr.message },
        { status: 400 }
      );
    }

    // 3) Ensure location (ADMIN)
    let locationId: string;
    try {
      locationId = await ensureLocation(orgId, locationName || businessName);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, reason: "location-create-failed", detail: e?.message ?? String(e) },
        { status: 400 }
      );
    }

    // 4) Ensure OWNER team member for that location (ADMIN)
    // Your UI gates role by org_id + location_id, so location_id must NOT be null.
    const { error: tmErr } = await supabaseAdmin.from("team_members").upsert(
      {
        org_id: orgId,
        location_id: locationId,
        user_id: user.id,
        email: email || null,
        name: displayName,
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
      },
      { onConflict: "org_id,location_id,user_id" }
    );

    if (tmErr) {
      // fallback if your unique is email-based
      const { error: tmErr2 } = await supabaseAdmin.from("team_members").upsert(
        {
          org_id: orgId,
          location_id: locationId,
          user_id: user.id,
          email: email || null,
          name: displayName,
          initials,
          role: "owner",
          active: true,
          login_enabled: true,
        },
        { onConflict: "org_id,location_id,email" }
      );

      if (tmErr2) {
        return NextResponse.json(
          { ok: false, reason: "team-upsert-failed", detail: tmErr2.message },
          { status: 400 }
        );
      }
    }

    // 5) Set profile org + active location (ADMIN)
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        org_id: orgId,
        full_name: ownerName || null,
        active_location_id: locationId,
      },
      { onConflict: "id" }
    );

    if (profErr) {
      return NextResponse.json(
        { ok: false, reason: "profile-upsert-failed", detail: profErr.message },
        { status: 400 }
      );
    }

    // 6) Trial subscription (ADMIN)
    const { data: existingSub, error: subSelErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id")
      .eq("org_id", orgId)
      .maybeSingle();

    if (subSelErr) {
      return NextResponse.json(
        { ok: false, reason: "billing-subscriptions-lookup-failed", detail: subSelErr.message },
        { status: 400 }
      );
    }

    if (!existingSub) {
      const trialEndsAt = addDays(new Date(), 14);

      const { error: subInsErr } = await supabaseAdmin.from("billing_subscriptions").insert({
        org_id: orgId,
        user_id: user.id,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_end: trialEndsAt.toISOString(),
        cancel_at_period_end: false,
      });

      if (subInsErr) {
        return NextResponse.json(
          { ok: false, reason: "billing-subscriptions-insert-failed", detail: subInsErr.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}