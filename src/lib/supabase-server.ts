// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type Database = any; // If you generated types, replace with your Database type.

export async function supabaseServer(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // NOTE: In Next 15, cookies() must be awaited before using.
  const get = (name: string) => cookieStore.get(name)?.value;

  const set = (name: string, value: string, options?: CookieOptions) => {
    // options typed by @supabase/ssr; pass through directly
    cookieStore.set({ name, value, ...options });
  };

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get,
        set,
        remove: (name: string, options?: CookieOptions) => {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
}
