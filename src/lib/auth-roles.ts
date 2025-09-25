// src/lib/auth-role.ts
export type SessionUser = { id: string; email: string | null };

export function hasRole(_user: SessionUser | null, _role: string): boolean {
  // keep permissive until you persist roles
  return !!_user;
}
