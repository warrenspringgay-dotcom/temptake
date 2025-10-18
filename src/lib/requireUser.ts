// src/lib/requireUser.ts
import { getServerSupabase } from "@/lib/supabaseServer";

export async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  if (!user) {
    throw new Error("Not authenticated");
  }

  return user;
}
