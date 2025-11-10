// src/components/AuthGate.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getUserOrNull } from "@/app/actions/auth";
import { hasRole, type Role } from "@/lib/roles";

type Props = {
  children: React.ReactNode;
  /**
   * Optional role(s) required to view this page.
   * If omitted, any logged-in user can view.
   */
  allow?: Role | Role[];
};

export default async function AuthGate({ children, allow }: Props) {
  const user = await getUserOrNull();

  // Not logged in at all
  if (!user) {
    redirect("/login");
  }

  // Try to pull a role string from user metadata.
  // You can adjust these keys if you store it differently.
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const appMeta = (user.app_metadata || {}) as Record<string, any>;
  const currentRole =
    (meta.role as string | undefined) ??
    (appMeta.role as string | undefined) ??
    null;

  // Normalise `allow` into an array of roles
  const allowedList = allow
    ? Array.isArray(allow)
      ? allow
      : [allow]
    : null;

  // If a list of roles was provided, require the user to have at least one.
  if (allowedList && !allowedList.some((r) => hasRole(currentRole, r))) {
    // Not authorised for this page
    redirect("/dashboard"); // or /not-authorized if you prefer
  }

  return <>{children}</>;
}
