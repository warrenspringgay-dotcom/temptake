// src/components/MobileMenu.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

const cls = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

// ✅ Updated to match current app routes
const mobileLinks: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/reports", label: "Reports" },
  { href: "/locations", label: "Locations & sites" },
];

export default function MobileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setOpen(false);
      router.push("/login");
      router.refresh?.();
    } catch (e) {
      console.error(e);
      alert("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
        aria-label="Open menu"
      >
        <span className="block h-[1px] w-3 bg-slate-800" />
        <span className="mt-[3px] block h-[1px] w-3 bg-slate-800" />
        <span className="mt-[3px] block h-[1px] w-3 bg-slate-800" />
      </button>

      {/* Overlay + sheet */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Dim background */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* Sheet */}
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Menu
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* User summary */}
            <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">
                {user?.user_metadata?.full_name ||
                  user?.user_metadata?.name ||
                  user?.email ||
                  "Account"}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Tap a section below to navigate.
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 overflow-y-auto px-1 py-2">
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cls(
                    "block rounded-xl px-3 py-2 text-sm text-slate-800",
                    "hover:bg-slate-100 active:bg-slate-200"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Footer: sign out */}
            <div className="border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <span>Sign out</span>
                <span className="text-xs">{signingOut ? "…" : "⏏"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
