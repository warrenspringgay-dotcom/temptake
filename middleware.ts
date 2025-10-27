// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseForMiddleware } from "@/lib/supabaseServer";

export const config = {
  // adjust your protected paths here
  matcher: [
    "/dashboard",
    "/routines",
    "/allergens",
    "/cleaning-rota",
    "/team",
    "/suppliers",
    "/reports",
    "/foodtemps",
  ],
};

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const { supabase, res } = supabaseForMiddleware(req);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = url.pathname + (url.search || "");
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  }

  return res; // continue
}
