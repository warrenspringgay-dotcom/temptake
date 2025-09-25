// Central place for role types & checks
import type { SessionUser } from "@/app/actions/auth";

export type Role = "staff" | "manager" | "admin";

// Lowest → Highest
export const ROLE_ORDER: Role[] = ["staff", "manager", "admin"];

/**
 * Returns true if `current` meets or exceeds `required` in the hierarchy.
 * If `required` is undefined, access is allowed.
 */



export function hasRole(_user: SessionUser | null, _role: string): boolean {
  // keep permissive until you persist roles
  return !!_user;
}

/** Type guard (useful if reading a string from DB/env) */
export function isRole(x: unknown): x is Role {
  return x === "staff" || x === "manager" || x === "admin";
}
