// src/components/UserMenu.tsx  (SERVER COMPONENT - no auth dependency)
import Link from "next/link";

export default async function UserMenu() {
  // No-op session: render a lightweight header menu.
  // When you wire real auth, fetch session/role here and branch accordingly.
  const user = null as { name?: string | null } | null;
  const displayName = user?.name?.trim() || "Guest";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-sm text-slate-600 sm:block">Hello, {displayName}</div>

      {/* Avatar-ish circle with initials (G for Guest) */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white"
        title={displayName}
        aria-label="User"
      >
        {(displayName[0] || "G").toUpperCase()}
      </div>

      {/* Auth actions — placeholder links (safe even without auth wired) */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Sign in
          </Link>
          {/* When auth is live, show a real sign-out action instead */}
          <Link
            href="/account"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Account
          </Link>
        </div>
      </div>
    </div>
  );
}
