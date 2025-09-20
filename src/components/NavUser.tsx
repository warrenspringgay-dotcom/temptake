// src/components/NavUser.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserLite = { email: string | null } | null;

/**
 * Minimal client-only nav user widget.
 * - Always renders valid JSX
 * - Won't throw if auth isn't wired up yet
 */
export default function NavUser() {
  const [user, setUser] = useState<UserLite>(null);

  // OPTIONAL: if you later stash user info in localStorage, this will show it.
  // Safe no-op otherwise.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tt:user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex items-center gap-3">
      {user?.email ? (
        <>
          <span className="text-sm text-muted-foreground truncate max-w-[180px]">
            {user.email}
          </span>
          <Link
            href="/logout"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Sign out
          </Link>
        </>
      ) : (
        <Link
          href="/login"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
