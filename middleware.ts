// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_EXACT = new Set<string>([
  "/",           // landing
  "/launch",
  "/launch-wall",
  "/help",
  "/app",        // demo dashboard
  "/login",
  "/signup",
  "/auth/callback",
]);

const PUBLIC_PREFIXES = [
  "/demo",       // any extra demo routes
  "/wall",
];

const SUB_PROTECTED_PREFIXES = [
  "/dashboard",
  "/routines",
  "/allergens",
  "/cleaning-rota",
  "/team",
  "/leaderboard",
  "/suppliers",
  "/reports",
  "/foodtemps",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Skip ALL API routes (Stripe webhooks etc.)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 1) Allow Next internals & static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".webmanifest")
  ) {
    return NextResponse.next();
  }

  // 2) Public pages (no auth required)
  if (PUBLIC_EXACT.has(pathname)) {
    return NextResponse.next();
  }
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 3) From here on, require a logged-in Supabase user
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "next",
      pathname + (req.nextUrl.search || "")
    );
    return NextResponse.redirect(url);
  }

  // 4) Check subscription for core app routes (billing itself stays open)
  if (SUB_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data: subRow, error } = await supabase
      .from("billing_subscriptions")
      .select("status,current_period_end,cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    let hasActiveSub = false;

    if (!error && subRow) {
      const status = (subRow.status ?? "").toLowerCase();
      const now = new Date();
      const periodEnd = subRow.current_period_end
        ? new Date(subRow.current_period_end)
        : null;

      if (
        (status === "active" || status === "trialing" || status === "past_due") &&
        (!periodEnd || periodEnd > now)
      ) {
        hasActiveSub = true;
      }
    }

    if (!hasActiveSub) {
      const billingUrl = req.nextUrl.clone();
      billingUrl.pathname = "/billing";
      billingUrl.searchParams.set("plan", "required");
      return NextResponse.redirect(billingUrl);
    }
  }

  // 5) All good – continue, keeping Supabase cookies in sync
  return res;
}

export const config = {
  // Run middleware for everything except /api/cron (your existing exclusion)
  matcher: ["/((?!api/cron).*)"],
};
