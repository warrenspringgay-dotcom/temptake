// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/pricing",
  "/guides",
  "/app",
  "/privacy",
  "/terms",
]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.match(
      /\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|txt|map|json|webmanifest|woff2?)$/
    )
  );
}

/**
 * Prevent open redirects and ensure we only redirect within this site.
 * Accepts values like "/settings/billing?x=1". Rejects absolute URLs, "//", etc.
 */
function sanitizeNext(nextRaw: string | null | undefined) {
  if (!nextRaw) return null;

  // Decode safely (avoid throwing on malformed sequences)
  let next = nextRaw;
  try {
    next = decodeURIComponent(nextRaw);
  } catch {
    // keep as-is if decode fails
  }

  // Must be a relative path starting with a single "/"
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;

  // Block protocol injections
  const lower = next.toLowerCase();
  if (lower.startsWith("/http:") || lower.startsWith("/https:")) return null;

  // Optional: prevent bouncing back to auth pages endlessly
  if (next === "/login" || next === "/signup") return "/dashboard";

  return next;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Let Stripe webhooks through untouched
  if (pathname.startsWith("/api/stripe/webhook")) return NextResponse.next();

  if (isStaticAsset(pathname)) return NextResponse.next();

  // Create response early so Supabase can attach refreshed cookies
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ✅ public routes (including guides sub-pages)
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/guides/") ||
    pathname.startsWith("/demo-wall");

  // 🔒 Not logged in → send to login with ?next=
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // 🔁 Logged in but trying to hit /login or /signup → send them on
  if (session && (pathname === "/login" || pathname === "/signup")) {
    const nextRaw = req.nextUrl.searchParams.get("next");
    const next = sanitizeNext(nextRaw) || "/dashboard";

    const url = req.nextUrl.clone();

    // If next includes query, parse it cleanly
    const parsed = new URL(next, req.nextUrl.origin);
    url.pathname = parsed.pathname;
    url.search = parsed.search; // preserve ?a=b from next
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api/cron).*)"],
};
