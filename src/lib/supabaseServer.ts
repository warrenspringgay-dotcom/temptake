// src/lib/supabaseServer.ts
// Single source of truth for the server-side Supabase client.
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

// Minimal, works in route handlers, server components, and server actions.
export async function createServerClient() {
  const cookieStore = await cookies();
  const hdrs = await headers();

  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          // next/headers cookies() supports set()
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
      headers: {
        // pass through request headers when available (auth, etc.)
        ...Object.fromEntries(hdrs),
      },
    }
  );

  return supabase;
}
