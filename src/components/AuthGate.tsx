// Server Component – do NOT add "use client"
import Link from "next/link";
import { hasRole, type Role } from "@/lib/get-user-role";

export default async function AuthGate({
  children,
  requireRole,             // e.g., "manager"
}: {
  children: React.ReactNode;
  requireRole?: Extract<Role, "owner" | "manager" | "staff">;
}) {
  if (!requireRole) return <>{children}</>;

  const ok = await hasRole([requireRole, ...(requireRole === "manager" ? ["owner"] : [])]);
  if (ok) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Access denied</h1>
      <p className="text-muted-foreground">
        Your role doesn’t permit access to this page.{" "}
        <Link className="underline" href="/">Go back</Link>
      </p>
    </div>
  );
}
