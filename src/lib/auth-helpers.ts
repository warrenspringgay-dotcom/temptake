// src/lib/auth-helpers.ts
import { createServerClient } from "@/lib/supabaseServer";

export type SessionUser = {
  id: string;
  email: string | null;
};

/** Small helper that mirrors a classic `getSession()` shape */
export async function getSession(): Promise<{ user: SessionUser | null }> {
  const supabase = await createServerClient();
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

/** Convenience: get the current user id or null */
export async function getUserId(): Promise<string | null> {
  const { user } = await getSession();
  return user?.id ?? null;
}

/** Convenience: throws if not signed in */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("Not signed in");
  return id;
}
