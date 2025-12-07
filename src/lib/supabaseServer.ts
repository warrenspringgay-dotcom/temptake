// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Read-only Supabase client for Server Components.
 * Uses the async cookies() API and NEVER writes cookies.
 */
export async function getServerSupabase() {
  const store = await cookies(); // Next 15: cookies() is async

  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value ?? undefined;
      },
      // No-ops so we never try to write cookies from a server component
      set() {
        /* noop */
      },
      remove() {
        /* noop */
      },
    },
  });
}

/**
 * Read/write Supabase client for **route handlers & server actions only**.
 * This is where we’re allowed to modify cookies.
 */
export async function getServerSupabaseAction() {
  const store = await cookies();

  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value ?? undefined;
      },
      set(name: string, value: string, options?: CookieOptions) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options?: CookieOptions) {
        store.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Helper for middleware – binds Supabase to a NextRequest/NextResponse pair.
 */
export function supabaseForMiddleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value ?? undefined;
      },
      set(name: string, value: string, options?: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options?: CookieOptions) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  return { supabase, res };
}
