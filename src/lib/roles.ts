// src/lib/roles.ts
// Central place for role types & checks

import type { User as SupabaseUser } from "@supabase/supabase-js";

export type Role = "staff" | "manager" | "admin";

/** Extend Supabase's User with optional metadata containers we read roles from. */
export type SessionUser = SupabaseUser & {
  user_metadata?: Record<string, unknown> & { roles?: Role[] };
  app_metadata?: Record<string, unknown> & { roles?: Role[] };
};

function rolesFrom(user: SessionUser | null | undefined): Role[] {
  if (!user) return [];
  const fromUser = (user.user_metadata as any)?.roles as Role[] | undefined;
  const fromApp = (user.app_metadata as any)?.roles as Role[] | undefined;
  return (fromUser ?? fromApp ?? []).filter(Boolean) as Role[];
}

export function hasRole(
  user: SessionUser | null | undefined,
  role: Role
): boolean {
  return rolesFrom(user).includes(role);
}

export function hasAnyRole(
  user: SessionUser | null | undefined,
  roles: Role[]
): boolean {
  if (!roles?.length) return false;
  const set = new Set(rolesFrom(user));
  return roles.some((r) => set.has(r));
}

export function isManager(user: SessionUser | null | undefined): boolean {
  // Managers and admins can pass manager checks
  return hasAnyRole(user, ["manager", "admin"]);
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return hasRole(user, "admin");
}
