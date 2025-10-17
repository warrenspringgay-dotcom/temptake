// src/components/AuthGate.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
// If your roles helper lives elsewhere, adjust this import:
import { hasRole } from "@/lib/roles";

type Props = {
  children: ReactNode;
  requireRole?: string; // or string[] if you support multiple roles
};

export default async function AuthGate({ children, requireRole }: Props) {
  const session = await getSession();           // Session | null
  const user = session?.user ?? null;           // User | null

  if (!user) {
    redirect("/login");
  }

  if (requireRole) {
    const ok = Array.isArray(requireRole)
      ? (requireRole as string[]).some((r) => hasRole(user, r))
      : hasRole(user, requireRole);

    if (!ok) {
      redirect("/not-authorized"); // or wherever you handle auth failures
    }
  }

  return <>{children}</>;
}
