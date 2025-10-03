// src/lib/supabaseServer.ts
import { cookies, headers } from "next/headers";
import { createServerClient as createSbClient } from "@supabase/ssr";

/**
 * Server-side Supabase client for App Router (RSC / Server Actions).
 * Use:
 *   const supabase = await createServerClient();
 */
export async function createServerClient() {
  // ⬇️ Next “dynamic APIs” must be awaited
  const cookieStore = await cookies();
  const hdrs = await headers();

  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      headers: hdrs,
      cookies: {
        // These are synchronous once you've awaited cookies() above
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options?: any) =>
          cookieStore.set({ name, value, ...options }),
        remove: (name: string, options?: any) =>
          cookieStore.delete({ name, ...options }),
      },
    }
  );
}

// also export default so accidental default imports still work
export default createServerClient;
