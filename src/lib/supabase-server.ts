// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Create a server-side Supabase client that persists auth cookies using Next 15's cookies() API.
 * NOTE: cookies() is async in Server Actions, so this factory is async.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Options intentionally untyped for broad Next compatibility.
        // We avoid importing Next's cookie types (not exported) and cast at the callsite.
        set(name: string, value: string, options?: Record<string, unknown>) {
          (cookieStore as any).set(name, value, options as any);
        },
        remove(name: string, options?: Record<string, unknown>) {
          if (options && Object.keys(options).length > 0) {
            (cookieStore as any).set(name, "", { ...(options as any), maxAge: 0 });
          } else {
            cookieStore.delete(name);
          }
        },
      },
    }
  );
}

/** Back-compat aliases so existing imports continue to work. */
export const supabaseServer = createSupabaseServerClient;
export const getServerSupabase = createSupabaseServerClient;
