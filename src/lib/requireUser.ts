// src/lib/requireUser.ts
import { getServerClient } from '@/lib/supabaseServer';

export async function requireUser() {
  const sb = await getServerSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return data.user;
}
