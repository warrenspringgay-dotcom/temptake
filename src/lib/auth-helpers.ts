// src/lib/auth-helpers.ts
import { supabaseServer } from "@/lib/supabase-server";

export type SessionUser = { id: string; email: string | null };

/** Back-compat shim for pages that import `getSession()` */
export async function getSession(): Promise<{ user: SessionUser | null }> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    return { user: null };
  }
  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  };
}
