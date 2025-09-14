// src/components/AuthGate.tsx
// Server component that currently *does not block* anything.
// This keeps local/guest builds working without auth actions wired.
// When you're ready to enforce auth, add your real check inside.

import React from "react";

type Role = "staff" | "manager" | "owner";

export default async function AuthGate({
  requireRole, // unused in the no-op gate
  children,
}: {
  requireRole?: Role;
  children: React.ReactNode;
}) {
  // No-op: always allow.
  // If you want to flip a switch in the future, you can do:
  // if (process.env.ENFORCE_AUTH === "1") { ...real check and conditional UI... }
  return <>{children}</>;
}
