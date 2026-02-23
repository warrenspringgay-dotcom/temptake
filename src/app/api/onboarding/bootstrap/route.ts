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

function slugify(input: string) {
  const base = (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const rand = Math.random().toString(36).slice(2, 8);
  return (base || "org") + "-" + rand;
}

/**
* Read auth from either:
* - Cookie session
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
    const { data: existing2 } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .ilike("name", name)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing2?.id) return String(existing2.id);
    throw insErr;
  }

  return String(created.id);
}

function errPayload(e: any) {
  return {
    message: e?.message ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    code: e?.code ?? null,
  };
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
    // Provide common required fields to satisfy NOT NULL / triggers.
    const slug = slugify(businessName || displayName || "org");

    // We don't know your exact orgs schema, so we include the usual suspects.
    // If a column doesn't exist, Postgres will error and we will RETURN that exact error.
    const orgInsert: any = {
      name: businessName || "My Business",
      slug,
      active: true,

      // common patterns:
      owner_user_id: user.id,
      created_by: user.id,
      user_id: user.id,
    };

    const { data: orgRow, error: orgErr } = await supabaseAdmin
      .from("orgs")
      .insert(orgInsert)
      .select("id")
      .single();

    if (orgErr) {
      return NextResponse.json(
        {
          ok: false,
          reason: "org-create-failed",
          attempted: Object.keys(orgInsert),
          error: errPayload(orgErr),
        },
        { status: 400 }
      );
    }

    const orgId = String(orgRow.id);

    // 2) Link user to org in user_orgs (ADMIN)
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
        { ok: false, reason: "user-org-link-failed", error: errPayload(uoErr) },
        { status: 400 }
      );
    }

    // 3) Ensure location (ADMIN)
    let locationId: string;
    try {
      locationId = await ensureLocation(orgId, locationName || businessName);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, reason: "location-create-failed", error: errPayload(e) },
        { status: 400 }
      );
    }

    // 4) Ensure OWNER team member for that location (ADMIN)
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
          { ok: false, reason: "team-upsert-failed", error: errPayload(tmErr2) },
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
        { ok: false, reason: "profile-upsert-failed", error: errPayload(profErr) },
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
        { ok: false, reason: "billing-subscriptions-lookup-failed", error: errPayload(subSelErr) },
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
          { ok: false, reason: "billing-subscriptions-insert-failed", error: errPayload(subInsErr) },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: "exception", error: errPayload(err) },
      { status: 500 }
    );
  }
}