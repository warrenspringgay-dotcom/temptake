// src/components/MobileMenu.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { useAuth } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { getActiveOrgIdClient } from "@/lib/orgClient";
import Image from "next/image";

type Tab = {
  href: string;
  label: string;
  requiresManager?: boolean;
  requiresPlan?: boolean; // needs active sub or trial
};

const navLinks: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },

  // plan-gated core app areas
  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning rota", requiresPlan: true },
  { href: "/food-hygiene", label: "Food hygiene", requiresPlan: true },
  {
    href: "/manager",
    label: "Manager Dashboard",
    requiresManager: true,
    requiresPlan: true,
  },
  { href: "/leaderboard", label: "Leaderboard", requiresPlan: true },
  { href: "/team", label: "Team", requiresPlan: true },
  { href: "/suppliers", label: "Suppliers", requiresPlan: true },
  { href: "/reports", label: "Reports", requiresPlan: true },
];

const publicLinks: { href: string; label: string }[] = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
];

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  // manager status (like NavTabs)
  const [canSeeManager, setCanSeeManager] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const { hasValid } = useSubscriptionStatus();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!ready || !user) {
        if (!cancelled) setCanSeeManager(false);
        return;
      }

      try {
        const orgId = await getActiveOrgIdClient();
        const email = user.email?.toLowerCase() ?? null;

        if (!orgId || !email) {
          if (!cancelled) setCanSeeManager(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setCanSeeManager(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase();
        setCanSeeManager(role === "owner" || role === "manager" || role === "admin");
      } catch {
        if (!cancelled) setCanSeeManager(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  // If auth not ready yet, don’t show anything to avoid logged-out flash
  if (!ready) return null;

  // Logged in: apply manager + plan gating
  const links: { href: string; label: string }[] = user
    ? navLinks.filter(
        (l) =>
          (!l.requiresManager || canSeeManager) &&
          (!l.requiresPlan || hasValid)
      )
    : publicLinks;

  const headerText = user ? "Menu" : "Welcome";

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 md:hidden"
        aria-label="Open menu"
      >
        <Image
          src="/logo.png"
          alt=""
          width={20}
          height={20}
          className="h-5 w-5"
          priority
        />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dim background – clicking closes menu */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* Sheet */}
          <div className="absolute right-2 top-2 w-[calc(100%-1rem)] max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {headerText}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {/* Nav links */}
            <nav className="max-h-[70vh] overflow-y-auto px-1 py-2">
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
            </nav>

            {/* Footer: simple auth action only (account stuff lives in UserMenu) */}
            <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2">
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/login");
                  }}
                  className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Sign in
                </button>
              ) : (
                <div className="text-[11px] text-slate-600">
                  Account options are under your initials button.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
