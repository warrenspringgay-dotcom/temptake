// src/lib/supabaseServer.ts
// Next 14/15 compatible server-side Supabase client for App Router.
// Keeps createServerClient() synchronous for use in server components & actions.

import { cookies } from "next/headers";
import { createServerClient as create, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieStoreShape = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
};

export function createServerClient(): SupabaseClient {
  // In Next 15, cookies() is typed as Promise<ReadonlyRequestCookies>.
  // We cast to a sync-like shape so we can keep a synchronous helper.
  const cookieStore = (cookies as unknown as () => CookieStoreShape)();

  const supabase = create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignore if headers already sent
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // ignore if headers already sent
          }
        },
      },
    }
  );

  return supabase;
}
