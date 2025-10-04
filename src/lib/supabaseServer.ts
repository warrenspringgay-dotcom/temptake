// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient as createSbServerClient } from "@supabase/ssr";

export async function createServerClient() {
  const cookieStore = await cookies(); // Next.js 15+ requires awaiting cookies()

  const supabase = createSbServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  return supabase;
}
