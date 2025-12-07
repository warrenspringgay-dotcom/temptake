// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseForMiddleware } from "@/lib/supabaseServer";

/*
  ADD THIS:
  Add "/app" and "/app/:path*" to matcher EXCLUSIONS
  so it becomes PUBLIC and completely bypasses auth checks.
*/

export const config = {
  matcher: [
    // Protected routes only — DO NOT include /app here.
    "/dashboard/:path*",
    "/routines/:path*",
    "/allergens/:path*",
    "/cleaning-rota/:path*",
    "/team/:path*",
    "/leaderboard/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/foodtemps/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // 1) Explicitly PUBLIC routes (no auth, no subscription)
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/client-landing") ||
    pathname.startsWith("/wall") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/app") ||   // 👈 NEW: make demo dashboard fully public
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")           // static assets
  ) {
    return NextResponse.next();
  }

  // 2) Require logged-in Supabase user for protected routes
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

  // 3) Subscription check (only for protected routes)
  try {
    const { data: subRow, error: subError } = await supabase
      .from("billing_subscriptions")
      .select("status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    let hasActiveSub = false;

    if (!subError && subRow) {
      const status = (subRow.status ?? "").toLowerCase();
      const now = new Date();
      const periodEnd = subRow.current_period_end
        ? new Date(subRow.current_period_end)
        : null;

      if (
        (status === "active" || status === "trialing") &&
        (!periodEnd || periodEnd > now)
      ) {
        hasActiveSub = true;
      }
    }

    if (!hasActiveSub) {
      const billingUrl = `/billing?plan=required`;
      return NextResponse.redirect(new URL(billingUrl, req.url));
    }
  } catch (e) {
    const billingUrl = `/billing?plan=required`;
    return NextResponse.redirect(new URL(billingUrl, req.url));
  }

  // 4) User logged in + active subscription → allow
  return res || NextResponse.next();
}
