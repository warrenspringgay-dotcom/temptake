// src/app/(protected)/layout.tsx
import React from "react";
import { requireUser } from "@/lib/requireUser";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce auth; your helper should throw/redirect to /login if unauthenticated
  await requireUser();

  return <>{children}</>;
}
