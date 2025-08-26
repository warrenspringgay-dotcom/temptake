// src/app/actions/presets.ts
import { cookies as nextCookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import type { CookieOptions } from "@supabase/ssr";

export type PresetRow = {
  id: string;
  org_id: string;
  kind: string;
  value: string;
  updated_by: string | null;
  created_at: string;
};

async function sbServer() {
  const store = await nextCookies();
  return supabaseServer({
    get: (n: string) => store.get(n)?.value ?? null,
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    set: (n: string, v: string, o: CookieOptions) => { void n; void v; void o; },
    remove: (n: string, o: CookieOptions) => { void n; void o; },
  });
}

async function requireOrg() {
  const sb = await sbServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) throw new Error("Not signed in");

  const { data: profile } = await sb.from("profiles").select("org_id").eq("id", auth.user.id).maybeSingle();
  const orgId = profile?.org_id ?? null;
  if (!orgId) throw new Error("Profile/org missing");

  return { sb, orgId, userId: auth.user.id as string };
}

export async function listPresets(kind: string): Promise<PresetRow[]> {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { data, error } = await sb
    .from("presets")
    .select("*")
    .eq("org_id", orgId)
    .eq("kind", kind)
    .order("value", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PresetRow[];
}

export async function upsertPreset(kind: string, value: string) {
  "use server";
  const { sb, orgId, userId } = await requireOrg();
  const { error } = await sb
    .from("presets")
    .upsert({ org_id: orgId, kind, value, updated_by: userId }, { onConflict: "org_id,kind,value" });
  if (error) throw error;
  return { ok: true as const };
}

export async function deletePreset(kind: string, value: string) {
  "use server";
  const { sb, orgId } = await requireOrg();
  const { error } = await sb.from("presets").delete().eq("org_id", orgId).eq("kind", kind).eq("value", value);
  if (error) throw error;
  return { ok: true as const };
}
