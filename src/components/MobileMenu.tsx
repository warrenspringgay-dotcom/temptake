// src/components/MobileMenu.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Props = {
  user: any | null;
};

const links: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/reports", label: "Reports" },
  { href: "/locations", label: "Locations & sites" },
  { href: "/help", label: "Help & support" },
];

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function MobileMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 🔐 Manager check – adjust to match your metadata shape if needed
  const isManager =
    user?.user_metadata?.role === "manager" ||
    user?.user_metadata?.is_manager === true;

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
      {/* Hamburger button (mobile only) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
        aria-label="Open menu"
      >
        <span className="block h-[2px] w-4 rounded bg-slate-800" />
        <span className="mt-[3px] block h-[2px] w-4 rounded bg-slate-800" />
        <span className="mt-[3px] block h-[2px] w-4 rounded bg-slate-800" />
      </button>

      {/* Overlay + panel */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Dim background */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* Light sheet/card */}
          <div className="absolute top-2 right-2 w-[calc(100%-1rem)] max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* User info */}
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

            {/* Nav links */}
            <nav className="max-h-[60vh] overflow-y-auto px-1 py-2">
              {links.map((link) => {
                const active =
                  pathname === link.href ||
                  (pathname?.startsWith(link.href + "/") ?? false);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm",
                      active
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* 🔐 Manager-only link */}
              {isManager && (
                <Link
                  href="/manager"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mt-1 block rounded-xl px-3 py-2 text-sm",
                    pathname === "/manager" ||
                      (pathname?.startsWith("/manager/") ?? false)
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-800 hover:bg-slate-50"
                  )}
                >
                  Manager dashboard
                </Link>
              )}
            </nav>

            {/* Sign out (no emoji) */}
            <div className="border-t border-slate-200 bg-rose-50/80 px-4 py-2">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center justify-center rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
