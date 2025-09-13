// src/utils/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  // Next.js now requires awaiting dynamic APIs like cookies()
  const cookieStore = await cookies();

  // @supabase/ssr supports async cookie handlers
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: async (name: string, value: string, options: any) => {
          // In RSC, direct mutation is allowed; Next writes back to response.
          (await cookies()).set({ name, value, ...options });
        },
        remove: async (name: string, options: any) => {
          (await cookies()).set({ name, value: "", ...options });
        },
      },
    }
  );

  return client;
}
