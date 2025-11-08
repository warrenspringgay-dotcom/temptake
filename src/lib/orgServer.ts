// src/lib/orgServer.ts
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";

/**
 * Server-side helper to get the active organisation id
 * for the current authenticated user.
 *
 * This will also create the org + membership if needed.
 */
export async function getActiveOrgIdServer(): Promise<string | null> {
  const orgId = await ensureOrgForCurrentUser();
  return orgId ?? null;
}

// Re-export in case other server code wants to call it directly
export { ensureOrgForCurrentUser };
