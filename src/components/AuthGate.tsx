// src/components/AuthGate.tsx (SERVER COMPONENT)
import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/app/actions/auth";

type Props = {
  children: React.ReactNode;
  /** Optional: restrict by role. "manager" automatically allows "owner" too. */
  requireRole?: "staff" | "manager" | "owner";
};

/**
 * Server-only gate. Put this at the top of protected pages:
 * 
 * export default async function Page() {
 *   return (
 *     <AuthGate requireRole="staff">
 *       ...page...
 *     </AuthGate>
 *   )
 * }
 */
export default async function AuthGate({ children, requireRole }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login");

  if (!requireRole) return <>{children}</>;

  const ok =
    requireRole === "manager"
      ? await hasRole(["manager", "owner"])
      : await hasRole([requireRole]);

  if (!ok) redirect("/"); // or a 403 page
  return <>{children}</>;
}
