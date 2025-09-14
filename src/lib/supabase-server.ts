// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client that persists auth cookies using Next's cookies() API.
 * We keep cookie options untyped to avoid depending on non-exported Next types.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Pass-through setter; options intentionally untyped for compatibility.
        set(name: string, value: string, options?: Record<string, unknown>) {
          // @ts-expect-error options intentionally untyped
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: Record<string, unknown>) {
          if (options && Object.keys(options).length > 0) {
            // @ts-expect-error options intentionally untyped
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } else {
            cookieStore.delete(name);
          }
        },
      },
    }
  );
}

/**
 * Back-compat alias so existing code `import { supabaseServer } from "@/lib/supabase-server"` keeps working.
 */
export function supabaseServer() {
  return createSupabaseServerClient();
}
