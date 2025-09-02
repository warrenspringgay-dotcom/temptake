// src/lib/roles.ts
export type Role = "staff" | "manager" | "admin";

/**
 * Role hierarchy:
 * - staff < manager < admin
 */
const hierarchy: Role[] = ["staff", "manager", "admin"];

export function hasRole(userRole: Role | null, required: Role): boolean {
  if (!userRole) return false;
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(required);
}
