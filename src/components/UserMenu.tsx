// src/components/UserMenu.tsx
"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";
import { signOutAction } from "@/app/actions/auth";

export type UserInfo = {
  id: string;
  email: string | null;
  fullName: string | null;
};

function getInitials(nameOrEmail: string | null | undefined) {
  if (!nameOrEmail) return "?";

  const name = nameOrEmail.trim();
  if (name.includes("@")) {
    return name[0]?.toUpperCase() ?? "?";
  }

  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0]?.toUpperCase() ?? "") +
    (parts[parts.length - 1][0]?.toUpperCase() ?? "")
  );
}

type Props = {
  initialUser?: UserInfo | null;
};

export default function UserMenu({ initialUser = null }: Props) {
  const [user, setUser] = useState<UserInfo | null>(initialUser);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Load / keep user in sync with Supabase client
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!mounted) return;
      if (u) {
        setUser({
          id: u.id,
          email: u.email ?? null,
          fullName: (u.user_metadata as any)?.full_name ?? null,
        });
      } else {
        setUser(null);
      }
    }

    // If we didn't get a server user, fetch from client
    if (!initialUser) {
      loadUser();
    }

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        if (u) {
          setUser({
            id: u.id,
            email: u.email ?? null,
            fullName: (u.user_metadata as any)?.full_name ?? null,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [initialUser]);

  const initials = getInitials(user?.fullName || user?.email || null);

  function handleSignOut() {
    supabase.auth.signOut().catch(() => {});
    startTransition(() => {
      signOutAction();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-4 py-3 border-b border-slate-100 text-xs text-slate-500">
            {user ? (
              <>
                <div className="mb-1 text-[11px] uppercase tracking-wide">
                  Signed in as
                </div>
                <div className="text-slate-800 text-sm break-all">
                  {user.email}
                </div>
              </>
            ) : (
              <div className="text-slate-700">Not signed in</div>
            )}
          </div>

          <div className="py-1 text-sm">
            {user ? (
              <>
                <Link
                  href="/settings"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  href="/food-hygiene"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Food hygiene rating log
                </Link>
                <Link
                  href="/locations"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Locations
                </Link>
                <Link
                  href="/billing"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Billing &amp; subscription
                </Link>


                {/* ✅ Direct guide link (the one you deployed) */}
                <Link
                  href="/guides/page"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Guides
                </Link>


                <Link
                  href="/help"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Help &amp; support
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isPending}
                  className="mt-1 block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {isPending ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Create account
                </Link>
                <Link
                  href="/help"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  Help &amp; support
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
