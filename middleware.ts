// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseForMiddleware } from "@/lib/supabaseServer";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/routines/:path*",
    "/allergens/:path*",
    "/cleaning-rota/:path*",
    "/team/:path*",
    "/leaderboard/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/foodtemps/:path*",
    "/billing/:path*",
  ],
};

// Edge-safe version of the subscription check.
// Uses the anon Supabase client with RLS disabled on billing_* tables.
async function orgHasValidSubscriptionEdge(
  supabase: ReturnType<typeof supabaseForMiddleware>["supabase"],
  orgId: string
) {
  if (!orgId) return false;

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("status, current_period_end, trial_ends_at, cancel_at_period_end")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) {
    console.error("[middleware] subscription lookup failed", {
      orgId,
      error,
    });
    return false;
  }

  const nowIso = new Date().toISOString();
  const isFuture = (iso: string | null) => !!iso && iso > nowIso;

  let hasValid = false;

  // Active sub
  if (data.status === "active") {
    hasValid = true;
  }

  // Trial still in date
  if (data.status === "trialing" && isFuture(data.trial_ends_at)) {
    hasValid = true;
  }

  // Cancelled but paid-up to period end
  if (data.cancel_at_period_end && isFuture(data.current_period_end)) {
    hasValid = true;
  }

  if (!hasValid) {
    console.log("[middleware] org has NO valid sub", {
      orgId,
      status: data.status,
      current_period_end: data.current_period_end,
      trial_ends_at: data.trial_ends_at,
      cancel_at_period_end: data.cancel_at_period_end,
    });
  }

  return hasValid;
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Public stuff
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/wall") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabase, res } = supabaseForMiddleware(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in at all → force login
  if (!user) {
    const redirectTo = `/login?next=${encodeURIComponent(
      pathname + url.search
    )}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Billing page itself should always be reachable once logged in
  if (pathname.startsWith("/billing")) {
    return res || NextResponse.next();
  }

  // Fetch org_id from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.org_id) {
    console.error("[middleware] no org_id for user", user.id, profileError);
    // No org yet → send them to billing / onboarding
    return NextResponse.redirect(new URL("/billing?reason=no-org", req.url));
  }

  const ok = await orgHasValidSubscriptionEdge(supabase, profile.org_id);

  if (!ok) {
    // HARD LOCK: any app route (except /billing) bounces here
    return NextResponse.redirect(
      new URL("/billing?reason=no-active-sub", req.url)
    );
  }

  // All good
  return res || NextResponse.next();
}
