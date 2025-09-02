// src/components/AuthGate.tsx
// Server Component – do NOT add "use client"
import Link from "next/link";
import { getSession } from "@/app/actions/auth";
import { hasRole, type Role } from "@/lib/roles";

export default async function AuthGate({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: Role; // "staff" | "manager" | "admin"
}) {
  // getSession() returns: { user: { id, email } | null, role: Role | null }
  const { user, role } = await getSession();

  // Not signed in → show a gentle gate with a link to login
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Sign in required</h2>
          <p className="mb-4 text-sm text-gray-600">
            You need to be signed in to view this page.
          </p>
          <Link
            href="/login"
            className="inline-flex rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but lacking the required role
  if (requireRole && !hasRole(role, requireRole)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Insufficient permissions</h2>
          <p className="text-sm text-gray-600">
            Your account doesn’t have access to this area.
          </p>
        </div>
      </div>
    );
  }

  // Allowed → render children
  return <>{children}</>;
}
