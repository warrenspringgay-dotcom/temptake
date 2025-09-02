// src/lib/auth.ts
export type Role = "staff" | "manager" | "admin";

/** Simple role check used by AuthGate and server actions */
export function hasRole(userRole: Role | null | undefined, min: Role): boolean {
  if (!userRole) return false;
  const rank: Record<Role, number> = { staff: 1, manager: 2, admin: 3 };
  return rank[userRole] >= rank[min];
}
