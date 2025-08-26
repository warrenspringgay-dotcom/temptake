// src/lib/auth.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type Profile = {
  id: string;               // auth.users.id
  email?: string | null;    // convenience
  role: "staff" | "manager" | "admin";
  full_name?: string | null;
  created_at?: string;
};

export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        /* handled by middleware response patching */
      },
      remove() {
        /* handled by middleware response patching */
      },
    },
  });
  return supabase;
}

type RequireRoleResult =
  | { ok: true; reason: null; user: User; profile: Profile | null }
  | { ok: false; reason: "unauthenticated" | "forbidden"; user: null; profile: null };

/** Read the signed‑in user + profile (role) on the server. */
export async function getServerUserAndProfile(): Promise<{ user: User | null; profile: Profile | null }> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as Profile | null) ?? null };
}

/** Quick role check for middleware/handlers. */
export async function requireRole(minRole: "staff" | "manager" | "admin"): Promise<RequireRoleResult> {
  const rank = { staff: 1, manager: 2, admin: 3 } as const;
  const { user, profile } = await getServerUserAndProfile();
  if (!user) return { ok: false, reason: "unauthenticated", user: null, profile: null };

  const r: "staff" | "manager" | "admin" = (profile?.role ?? "staff");
  const ok = rank[r] >= rank[minRole];
  if (ok) return { ok: true, reason: null, user, profile };
  return { ok: false, reason: "forbidden", user: null, profile: null };
}

/** Helper to patch cookies through a NextResponse in middleware (placeholder) */
export function withSupabaseOnResponse(_req: NextRequest, res: NextResponse) {
  return res;
}
