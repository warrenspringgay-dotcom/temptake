// src/app/(protected)/layout.tsx

import React from "react";

/**
 * Protected app layout
 *
 * All auth + subscription checks are enforced in `middleware.ts`
 * so this layout just wraps the protected pages without adding
 * another header or running extra Supabase queries.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
