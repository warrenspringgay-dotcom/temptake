// middleware.ts (ROOT)
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";

const OPEN_PREFIXES = ["/login"]; // add other true-public prefixes here

function isOpenPath(path: string) {
  return OPEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

function hasSbCookies(req: NextRequest) {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

function clearSbCookies(req: NextRequest, res: NextResponse) {
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-")) {
      res.cookies.set({
        name: c.name,
        value: "",
        expires: new Date(0),
        httpOnly: true,
        path: "/",
      });
    }
  }
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { pathname, search } = url;

  // Always allow truly public pages.
  if (isOpenPath(pathname)) return NextResponse.next();

  // Fast path: if there are no Supabase cookies, redirect immediately.
  if (!hasSbCookies(req)) {
    const redirect = encodeURIComponent(pathname + (search || ""));
    return NextResponse.redirect(new URL(`/login?redirect=${redirect}`, req.url));
  }

  // Validate cookies with Supabase Auth; if invalid, wipe and redirect.
  const res = NextResponse.next();
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options?: CookieOptions) =>
          res.cookies.set({ name, value, ...options }),
        remove: (name, options?: CookieOptions) =>
          res.cookies.set({ name, value: "", ...options, expires: new Date(0) }),
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  const authed = !!data?.user && !error;

  if (!authed) {
    clearSbCookies(req, res);
    const redirect = encodeURIComponent(pathname + (search || ""));
    return NextResponse.redirect(new URL(`/login?redirect=${redirect}`, req.url));
  }

  // Keep session fresh (ignore errors)
  try { await supabase.auth.getSession(); } catch {}

  return res;
}

// run on real pages only
export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
