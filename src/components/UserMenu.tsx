// src/components/UserMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type User = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
  };
} | null;

export default function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // If no user, just show a Login button
  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50"
      >
        Login
      </button>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Account";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "U";

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      setOpen(false);
      router.push("/login");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* JUST THE CIRCLE, NO NAME TEXT */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center"
        aria-label="Account menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
          {initials}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/help");
            }}
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
          >
            Help
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-3 py-2 text-left text-red-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
