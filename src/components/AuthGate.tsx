// src/components/AuthGate.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/app/actions/auth";
import { hasRole, type Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  /** Allow access if the user has ANY of these roles */
  allow?: Role[];
  redirectTo?: string;
};

export default async function AuthGate({
  children,
  allow,
  redirectTo = "/login",
}: Props) {
  const user = await getUserOrNull();

  if (!user) {
    redirect(redirectTo);
  }

  // If a list of roles was provided, require the user to have at least one.
  if (allow && !allow.some((r) => hasRole(user, r))) {
    redirect("/dashboard"); // or a /not-authorized page if you have one
  }

  return <>{children}</>;
}
