// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toInitials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return null;

  // If it's an email, use first 2 chars
  if (s.includes("@")) return s.slice(0, 2).toUpperCase();

  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  const out = (a + b).toUpperCase();
  return out || null;
}

async function getUserFromRequest(req: NextRequest) {
  // 1) Cookie session
  const supabase = await getServerSupabase();
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();

  if (!cookieErr && cookieAuth?.user) {
    return { user: cookieAuth.user, via: "cookie" as const };
  }

  // 2) Bearer token fallback (useful immediately after signup)
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (token) {
    const { data: tokenAuth, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenAuth?.user) {
      return { user: tokenAuth.user, via: "bearer" as const };
    }
  }

  return { user: null, via: "none" as const };
}

export async function POST(req: NextRequest) {
  try {
    // ✅ DO NOT create org/billing unless we KNOW the user
    const { user } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { ok: false as const, reason: "no-auth-session" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | { ownerName?: string; businessName?: string }
      | null;

    const ownerName = (body?.ownerName ?? "").trim();
    const businessName = (body?.businessName ?? "").trim();

    // 1) Create org/team/location etc
    const result = await ensureOrgForCurrentUser({ ownerName, businessName });

    if (!result?.ok) {
      return NextResponse.json(
        { ok: false as const, reason: "ensure-org-failed", detail: (result as any)?.reason ?? null },
        { status: 500 }
      );
    }

    const orgId: string | undefined = (result as any).orgId ?? (result as any).org_id;
    let locationId: string | undefined =
      (result as any).locationId ?? (result as any).location_id;

    if (!orgId) {
      return NextResponse.json(
        { ok: false as const, reason: "missing-org-id" },
        { status: 500 }
      );
    }

    // If ensureOrg didn't return a locationId, fetch the first location for org
    if (!locationId) {
      const { data: loc, error: locErr } = await supabaseAdmin
        .from("locations")
        .select("id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!locErr && loc?.id) locationId = String(loc.id);
    }

    if (!locationId) {
      return NextResponse.json(
        { ok: false as const, reason: "missing-location-id" },
        { status: 500 }
      );
    }

    const email = (user.email ?? "").trim().toLowerCase();
    const displayName = ownerName || (email ? email.split("@")[0] : "Owner");
    const initials = toInitials(displayName || email || "Owner");

    // 2) Ensure OWNER team_members row exists FOR THIS LOCATION (critical)
    // Also set user_id so future lookups work reliably.
    const { error: tmErr } = await supabaseAdmin
      .from("team_members")
      .upsert(
        {
          org_id: orgId,
          location_id: locationId,
          user_id: user.id,
          email: email || null,
          name: displayName,
          initials,
          role: "owner",
          active: true,
        },
        {
          // adjust this to match your unique constraint:
          // recommended unique: (org_id, location_id, user_id) or (org_id, location_id, email)
          onConflict: "org_id,location_id,user_id",
        }
      );

    if (tmErr) {
      // fallback: some schemas use email unique instead of user_id
      const { error: tmErr2 } = await supabaseAdmin
        .from("team_members")
        .upsert(
          {
            org_id: orgId,
            location_id: locationId,
            user_id: user.id,
            email: email || null,
            name: displayName,
            initials,
            role: "owner",
            active: true,
          },
          { onConflict: "org_id,location_id,email" }
        );

      if (tmErr2) {
        return NextResponse.json(
          {
            ok: false as const,
            reason: "team-member-upsert-failed",
            detail: tmErr2.message,
          },
          { status: 500 }
        );
      }
    }

 const { error: ownerErr } = await supabaseAdmin.from("team_members").upsert(
  {
    org_id: orgId,
    location_id: locationId, // ✅ NOT NULL
    user_id: user.id,
    email: email || null,
    name: displayName,
    initials,
    role: "owner",
    active: true,
  },
  { onConflict: "org_id,location_id,user_id" }
);

if (ownerErr) {
  return NextResponse.json(
    { ok: false as const, reason: "team-member-upsert-failed", detail: ownerErr.message },
    { status: 500 }
  );
}

    // 3) Ensure trial subscription row exists for this org (idempotent)
    const { data: existingSub, error: existingErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id,status,trial_ends_at,current_period_end")
      .eq("org_id", orgId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json(
        {
          ok: false as const,
          reason: "billing-subscriptions-lookup-failed",
          detail: existingErr.message,
        },
        { status: 500 }
      );
    }

    if (!existingSub) {
      const trialEndsAt = addDays(new Date(), 14);

      const { error: insertErr } = await supabaseAdmin.from("billing_subscriptions").insert({
        org_id: orgId,
        user_id: user.id,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_end: trialEndsAt.toISOString(),
        cancel_at_period_end: false,
      });

      if (insertErr) {
        return NextResponse.json(
          {
            ok: false as const,
            reason: "billing-subscriptions-insert-failed",
            detail: insertErr.message,
          },
          { status: 500 }
        );
      }
    }

    // 4) Set active org/location cookies so middleware + UI have context immediately
    const res = NextResponse.json({
      ...result,
      orgId,
      locationId,
      billingOk: true,
    });

    // cookies used by your middleware
    res.cookies.set("tt_active_org", orgId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("tt_active_location", locationId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    // 5) Send welcome email (do not block signup if email fails)
    try {
      const to = user.email?.trim();
      if (to) {
        await sendEmail({
          to,
          subject: "Welcome to TempTake",
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
              <h2 style="margin:0 0 12px">Welcome to TempTake</h2>
              <p style="margin:0 0 12px">
                Your account is set up and your 14-day trial is active.
              </p>
              <p style="margin:0 0 12px">
                Next step: add your first location and run today’s checks.
              </p>
              <p style="margin:0">
                Need help? Reply to this email.
              </p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error("[signup/bootstrap] welcome email failed", emailErr);
    }

    return res;
  } catch (err: any) {
    console.error("[signup/bootstrap] unexpected error", err);
    return NextResponse.json(
      {
        ok: false as const,
        reason: "exception",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}