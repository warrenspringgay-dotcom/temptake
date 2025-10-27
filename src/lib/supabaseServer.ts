// src/lib/supabaseServer.ts
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Safe to use in Server Components (read-only cookie store) */
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

/** Use this inside server actions / route handlers (writable cookie store) */
export async function getServerSupabaseAction() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
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

/** Helper for middleware – creates a client bound to the request/response */
export function supabaseForMiddleware(req: NextRequest) {
  const res = NextResponse.next();
  return {
    supabase: createServerClient(URL, KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }),
    res,
  };
}
