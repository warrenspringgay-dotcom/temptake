// src/components/UserMenu.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  user: { email?: string | null } | null;
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClick);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const initials = user?.email?.[0]?.toUpperCase() ?? "⋯";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-sm font-semibold hover:bg-gray-50"
        title={user?.email ?? "Menu"}
      >
        {initials}
      </button>

      {/* Dropdown */}
      <div
        className={[
          "absolute right-0 mt-2 w-48 origin-top-right rounded-xl border bg-white shadow-lg",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
          "transition",
        ].join(" ")}
        role="menu"
      >
        <div className="py-1 text-sm">
          <Link
            href="/help"
            className="block px-3 py-2 hover:bg-gray-50"
            role="menuitem"
          >
            Help
          </Link>

          <Link
            href="/settings"
            className="block px-3 py-2 hover:bg-gray-50"
            role="menuitem"
          >
            Settings
          </Link>

          {user ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full px-3 py-2 text-left text-red-600 hover:bg-gray-50"
                role="menuitem"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="block px-3 py-2 hover:bg-gray-50"
              role="menuitem"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
