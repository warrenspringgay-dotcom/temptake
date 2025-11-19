// src/components/UserMenu.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

type UserMenuProps = {
  user: any;
};

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials =
    user?.user_metadata?.initials ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-xl z-50"
          role="menu"
        >
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
              Help &amp; support
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
