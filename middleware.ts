import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

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

  // 2) No subscription check for now – let them through
  return res;
}
