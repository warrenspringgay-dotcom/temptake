// src/components/UserMenu.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh?.();
  }

  const initial =
    user?.email?.charAt(0).toUpperCase() ||
    user?.user_metadata?.full_name?.charAt(0).toUpperCase() ||
    "A";

  return (
    <div className="relative">
      {/* Circle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg z-50">
          {user ? (
            <>
              {/* Logged-in state */}
              <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
                <div className="text-slate-400">Signed in as</div>
                <div className="truncate font-medium">
                  {user.email ?? "User"}
                </div>
              </div>

              <Link
                href="/locations"
                className="block px-3 py-2 hover:bg-slate-50"
              >
                Locations
              </Link>
              <Link href="/help" className="block px-3 py-2 hover:bg-slate-50">
                Help &amp; support
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {/* Logged-out state */}
              <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
                <div className="text-slate-400">Not signed in</div>
              </div>

              <Link
                href="/login"
                className="block px-3 py-2 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="block px-3 py-2 hover:bg-slate-50"
              >
                Create account
              </Link>
              <Link href="/help" className="block px-3 py-2 hover:bg-slate-50">
                Help &amp; support
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
