// Central place for role types & checks

export type Role = "staff" | "manager" | "admin";

// Lowest → Highest
export const ROLE_ORDER: Role[] = ["staff", "manager", "admin"];

/**
 * Returns true if `current` meets or exceeds `required` in the hierarchy.
 * If `required` is undefined, access is allowed.
 */
export function hasRole(current: Role | null | undefined, required?: Role): boolean {
  if (!required) return true;
  if (!current) return false;
  return ROLE_ORDER.indexOf(current) >= ROLE_ORDER.indexOf(required);
}

/** Type guard (useful if reading a string from DB/env) */
export function isRole(x: unknown): x is Role {
  return x === "staff" || x === "manager" || x === "admin";
}
