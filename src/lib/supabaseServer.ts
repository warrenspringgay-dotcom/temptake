// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Supabase client for Server Components / Route Handlers.
 * Reads cookies. Does not write cookies (server components cannot mutate response).
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops in server components / route handlers unless you wire response cookies.
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * Backwards-compatible alias.
 * Some files still import `getServerSupabaseAction`.
 */
export const getServerSupabaseAction = getServerSupabase;
