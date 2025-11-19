"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials =
    user?.user_metadata?.initials ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="relative">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white"
        aria-label="Open account menu"
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg"
          style={{ zIndex: 60 }}
        >
          {/* User info */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-sm font-medium">
              {user?.email ?? "Account"}
            </div>
          </div>

          {/* Links */}
          <div className="px-1 py-2 text-sm">
            <Link
              href="/locations"
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Locations &amp; sites
            </Link>
            <Link
              href="/help"
              className="mt-1 block rounded-lg px-3 py-2 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Help &amp; support
            </Link>
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-between rounded-b-xl border-t border-slate-100 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
