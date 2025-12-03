// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseForMiddleware } from "@/lib/supabaseServer";
import { orgHasValidSubscription } from "@/lib/billing";

export const config = {
  matcher: [
    // App sections that require login + valid org subscription
    "/dashboard/:path*",
    "/routines/:path*",
    "/allergens/:path*",
    "/cleaning-rota/:path*",
    "/team/:path*",
    "/leaderboard/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/foodtemps/:path*",

    // Billing page: login required, but allowed even with no / bad sub
    "/billing/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // These routes are always public (middleware still won't run for most of
  // them because of `matcher`, but this is a safety net if matcher changes).
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/wall") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") // static assets
  ) {
    return NextResponse.next();
  }

  // 1) Require an authenticated user
  const { supabase, res } = supabaseForMiddleware(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTo = `/login?next=${encodeURIComponent(
      pathname + url.search
    )}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // 2) Billing page: user must be logged in, but subscription can be anything
  // (new trial, expired, cancelled etc – they land here to sort it out).
  if (pathname.startsWith("/billing")) {
    return res || NextResponse.next();
  }

  // 3) For all *other* matched routes, enforce org-level subscription

  // Get user's org_id from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.org_id) {
    console.error("[middleware] no org_id for user", user.id, profileError);
    // No org = no access to app; send them to billing/setup
    return NextResponse.redirect(new URL("/billing?reason=no-org", req.url));
  }

  // orgHasValidSubscription should treat `active` and `trialing` as OK,
  // and everything else (canceled, past_due, incomplete, unpaid, null)
  // as NOT OK.
  const ok = await orgHasValidSubscription(profile.org_id);

  if (!ok) {
    return NextResponse.redirect(
      new URL("/billing?reason=no-active-sub", req.url)
    );
  }

  // 4) All good – user is logged in, has org, and org has a valid sub/trial
  return res || NextResponse.next();
}
