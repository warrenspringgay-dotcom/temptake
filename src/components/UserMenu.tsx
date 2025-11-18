"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

export default function UserMenu({ user }: { user: any }) {
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
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-xl z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b">
            <div className="text-xs text-slate-500">Signed in as</div>
            <div className="truncate text-sm font-medium">
              {user?.email}
            </div>
          </div>

          {/* Settings links */}
          <div className="px-1 py-2">
            <Link
              href="/locations"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Locations
            </Link>

            <Link
              href="/help"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Help & support
            </Link>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-between rounded-none border-t bg-red-50 px-4 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
