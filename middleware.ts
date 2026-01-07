// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
]);

// ✅ Machine-to-machine endpoints that must NEVER redirect to /login
const PUBLIC_API_PATHS = new Set<string>([
  "/api/stripe/webhook",
]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|map|woff2?)$/)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();

  // ✅ Stripe (and similar services) will not have a session cookie.
  // If we redirect them to /login, Stripe marks the webhook delivery as failed (307).
  if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

  // Create response first so Supabase can write refreshed cookies onto it
  const res = NextResponse.next();

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

  // This both reads session AND refreshes cookies when needed
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    const target = req.nextUrl.searchParams.get("redirect") || "/";
    const url = req.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api/cron).*)"],
};
