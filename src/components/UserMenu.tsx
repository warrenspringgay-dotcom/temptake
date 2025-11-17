// src/components/UserMenu.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

function getInitials(user: any | null): string {
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "";
  if (!name) return "TT";

  const parts = name
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

 const initials = parts
  .slice(0, 3)
  .map((p: string) => p.charAt(0).toUpperCase())
  .join("");


  return initials || "TT";
}

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
    }
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh?.();
    } catch (e) {
      console.error(e);
      alert("Sign out failed");
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  const initials = getInitials(user);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cls(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase",
          "bg-slate-900 text-white shadow hover:bg-slate-800"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-slate-200 bg-white/95 p-1 text-sm text-slate-800 shadow-lg backdrop-blur">
          {/* User summary */}
          <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-xs font-medium text-slate-800">
              {user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                user?.email ||
                "Account"}
            </div>
          </div>

          <div className="my-1 h-px bg-slate-100" />

          {/* ONLY the pages you actually want */}
          <nav className="space-y-0.5">

            {/* Locations */}
            <Link
              href="/locations"
              className="flex w-full items-center rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Locations
            </Link>

            {/* Help */}
            <Link
              href="/help"
              className="flex w-full items-center rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Help & support
            </Link>
          </nav>

          <div className="my-1 h-px bg-slate-100" />

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <span>Sign out</span>
            <span className="text-[10px]">{signingOut ? "…" : "⏏"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
