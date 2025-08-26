import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /admin/*
  if (!pathname.startsWith("/admin/")) return NextResponse.next();

  const res = NextResponse.next();

  // NOTE: In middleware, @supabase/ssr expects cookies.getAll/setAll
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        // Map Next's cookies to the shape Supabase expects
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookies) {
        // Write all cookies to the response
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Role check (manager+ required)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "staff" | "manager" | "admin" | undefined) ?? "staff";
  if (role !== "manager" && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "forbidden");
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
