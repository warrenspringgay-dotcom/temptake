// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Only these routes require:
 *  - logged-in Supabase user
 *  - active / trial subscription
 *
 * Everything else (/, /launch, /app, /demo-wall, etc.)
 * is PUBLIC and this middleware does not run there.
 */
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
  ],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Supabase auth client for middleware
  const supabase = createMiddlewareClient({ req, res });

  // 1) Require logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!user) {
    const redirectTo = `/login?next=${encodeURIComponent(
      pathname + url.search
    )}`;
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // 2) Require active / trial subscription
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
  } catch {
    // On error, send them to billing as a safe default
    const billingUrl = `/billing?plan=required`;
    return NextResponse.redirect(new URL(billingUrl, req.url));
  }

  // 3) All good – let the request through
  return res;
}
