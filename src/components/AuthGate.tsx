// src/components/AuthGate.tsx (SERVER COMPONENT)
import { redirect } from "next/navigation";

import { getSession } from "@/app/actions/auth";
import { hasRole } from "@/lib/auth-roles";


type Props = {
  children: React.ReactNode;
  /** Optional: require a role; tweak hasRole() in actions/auth.ts to match your model */
  requireRole?: string;
};

export default async function AuthGate({ children, requireRole }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  if (requireRole && !hasRole(user, requireRole)) {
    // You can change this to redirect to an “/forbidden” page instead
    redirect("/login");
  }

  return <>{children}</>;
}
