// src/components/UserMenu.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";
import { signOutAction } from "@/app/actions/auth";

type UserInfo = {
  id: string;
  email: string | null;
  fullName: string | null;
};

function getInitials(nameOrEmail: string | null | undefined) {
  if (!nameOrEmail) return "?";

  const name = nameOrEmail.trim();
  // if it looks like an email, use first letter
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

export default function UserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Load current user from Supabase (client) and listen for changes
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

    loadUser();

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
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initials = getInitials(user?.fullName || user?.email || null);

  function handleSignOut() {
    // Close menu straight away
    setOpen(false);

    // Clear client session immediately
    supabase.auth.signOut().catch(() => {});
    // Then run server sign-out (clears cookies + redirects to /login)
    startTransition(() => {
      signOutAction();
    });
  }

  // Helper so we don't repeat setOpen(false) everywhere
  const closeAnd = (fn?: () => void) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
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
                  onClick={closeAnd()}
                >
                  Settings
                </Link>
                <Link
                  href="/food-hygiene"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
                >
                  Food hygiene rating log
                </Link>
                <Link
                  href="/locations"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
                >
                  Locations
                </Link>
                <Link
                  href="/billing"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
                >
                  Billing &amp; subscription
                </Link>
                <Link
                  href="/help"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
                >
                  Help &amp; support
                </Link>

                <button
                  type="button"
                  onClick={closeAnd(handleSignOut)}
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
                  onClick={closeAnd()}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
                >
                  Create account
                </Link>
                <Link
                  href="/help"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  onClick={closeAnd()}
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
