// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthResult = {
  ok: boolean;
  message?: string;
  redirect?: string;
};

function safeNext(next?: string | null) {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function getUserOrNull() {
  const supabase = await getServerSupabaseAction();
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function signInAction(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const supabase = await getServerSupabaseAction();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next") as string | null);

  if (!email || !password) {
    return { ok: false, message: "Missing email or password." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  return { ok: true, redirect: next };
}

/**
 * ✅ Provision the "app data" for a brand new auth user.
 * This runs on the server and uses supabaseAdmin for inserts.
 */
export async function provisionNewUserAction(input: {
  userId: string;
  email: string;
  fullName: string;
  businessName?: string;
  locationName?: string;
}): Promise<AuthResult> {
  const { userId, email, fullName, businessName, locationName } = input;

  console.log("[provision] Starting provision for:", { userId, email, fullName });

  if (!userId || !email || !fullName) {
    return { ok: false, message: "Missing provisioning details." };
  }

  try {
    // 1) Create org
    const orgNameToUse = (businessName ?? "").trim() || `${fullName}'s Kitchen`;
    console.log("[provision] Creating org:", orgNameToUse);

    const { data: orgRow, error: orgErr } = await supabaseAdmin
      .from("orgs")
      .insert({ name: orgNameToUse })
      .select("id")
      .single();

    if (orgErr) {
      console.error("[provision] orgs insert failed:", orgErr);
      return { ok: false, message: `Failed to create organisation: ${orgErr.message}` };
    }

    if (!orgRow?.id) {
      console.error("[provision] No org ID returned");
      return { ok: false, message: "Failed to create organisation (no ID)." };
    }

    const orgId = String(orgRow.id);
    console.log("[provision] Org created:", orgId);

    // 2) Profile
    console.log("[provision] Creating profile for user:", userId);
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          org_id: orgId,
          role: "owner",
        },
        { onConflict: "id" }
      );

    if (profErr) {
      console.error("[provision] profiles upsert failed:", profErr);
      return { ok: false, message: `Failed to create profile: ${profErr.message}` };
    }
    console.log("[provision] Profile created");

    // 3) Team member
    const initials = fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

    console.log("[provision] Creating team member");
    const { error: tmErr } = await supabaseAdmin.from("team_members").insert({
      org_id: orgId,
      email,
      name: fullName,
      role: "owner",
      initials,
    });

    if (tmErr) {
      console.error("[provision] team_members insert failed:", tmErr);
      return { ok: false, message: `Failed to create team member: ${tmErr.message}` };
    }
    console.log("[provision] Team member created");

    // 4) Default location
    const defaultLocationName = (locationName ?? "").trim() || "Main site";
    console.log("[provision] Creating location:", defaultLocationName);

    const { error: locErr } = await supabaseAdmin.from("locations").insert({
      org_id: orgId,
      name: defaultLocationName,
      active: true,
    });

    if (locErr) {
      console.error("[provision] locations insert failed:", locErr);
      return { ok: false, message: `Failed to create default location: ${locErr.message}` };
    }
    console.log("[provision] Location created");

    console.log("[provision] ✅ Provision complete for user:", userId);
    return { ok: true };

  } catch (err) {
    console.error("[provision] Unexpected error:", err);
    return { 
      ok: false, 
      message: `Provisioning error: ${err instanceof Error ? err.message : 'Unknown error'}` 
    };
  }
}

export async function signUpAction(): Promise<AuthResult> {
  return {
    ok: false,
    message:
      "Signup must run in the browser. Use SignupClient + provisionNewUserAction.",
  };
}

export async function signOutAction() {
  const supabase = await getServerSupabaseAction();
  await supabase.auth.signOut();
  redirect("/login");
}