// src/lib/roles.ts

export type Role = "owner" | "admin" | "manager" | "staff";

/**
 * Normalise anything from the DB into a valid Role.
 * Falls back to "staff" if missing or unknown.
 */
export function normalizeRole(input: unknown): Role {
  const v =
    typeof input === "string"
      ? input.trim().toLowerCase()
      : input && typeof (input as any).toString === "function"
      ? (input as any).toString().trim().toLowerCase()
      : "";

  if (v === "owner" || v === "admin" || v === "manager" || v === "staff") {
    return v;
  }

  // default / fallback
  return "staff";
}

/**
 * Check if a given current role satisfies the required role.
 *
 * owner > admin > manager > staff
 */
export function hasRole(
  current: string | Role | null | undefined,
  required: Role
): boolean {
  const role = normalizeRole(current);

  if (required === "staff") {
    // any valid user passes
    return true;
  }

  if (required === "manager") {
    return role === "manager" || role === "admin" || role === "owner";
  }

  if (required === "admin") {
    return role === "admin" || role === "owner";
  }

  if (required === "owner") {
    return role === "owner";
  }

  return false;
}

/**
 * Convenience: can this role manage org-level settings?
 */
export function canManageOrg(current: string | Role | null | undefined): boolean {
  const role = normalizeRole(current);
  return role === "owner" || role === "admin" || role === "manager";
}

/** Optional helper if you want a list for selects, etc. */
export const ROLES: Role[] = ["owner", "admin", "manager", "staff"];
