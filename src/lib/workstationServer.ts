// src/lib/workstationServer.ts
import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type OperatorSession = {
  orgId: string;
  locationId: string;
  teamMemberId: string;
  role: string | null;
};

const COOKIE_NAME = "tt_op_sess";

function roleRank(role: string | null) {
  const r = (role ?? "staff").toLowerCase();
  if (r === "owner") return 4;
  if (r === "admin") return 3;
  if (r === "manager") return 2;
  if (r === "supervisor") return 1;
  return 0;
}

export async function getOperatorSessionOrNull(): Promise<OperatorSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? "";
  if (!token) return null;

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("workstation_operator_sessions")
    .select("org_id, location_id, team_member_id, role, expires_at")
    .eq("token", token)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    orgId: String((data as any).org_id),
    locationId: String((data as any).location_id),
    teamMemberId: String((data as any).team_member_id),
    role: (data as any).role ? String((data as any).role) : null,
  };
}

export async function requireOperatorRole(
  minRole: "staff" | "supervisor" | "manager" | "admin" | "owner"
) {
  const sess = await getOperatorSessionOrNull();
  if (!sess) return { ok: false as const, reason: "no-operator" };

  const ok = roleRank(sess.role) >= roleRank(minRole);
  if (!ok) return { ok: false as const, reason: "insufficient-role", operatorRole: sess.role };

  return { ok: true as const, session: sess };
}

export async function clearOperatorCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setOperatorCookie(token: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}