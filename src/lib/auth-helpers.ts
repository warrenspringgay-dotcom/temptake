// src/lib/auth-helpers.ts
import { supabaseServer } from "@/lib/supabase-server";

export type Session = {
  user: { id: string; email: string | null } | null;
};

export async function getSession(): Promise<Session> {
  const supabase = await supabaseServer(); // ← await the client
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    return { user: { id: data.user.id, email: data.user.email ?? null } };
  }
  return { user: null };
}
