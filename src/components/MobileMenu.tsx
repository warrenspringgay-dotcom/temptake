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
  icon?: React.ReactNode;
  requiresManager?: boolean;
  requiresPlan?: boolean; // needs active sub or trial
};

const authedLinks: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },

  // plan-gated
  { href: "/routines", label: "Routines", requiresPlan: true },
  { href: "/allergens", label: "Allergens", requiresPlan: true },
  { href: "/cleaning-rota", label: "Cleaning rota", requiresPlan: true },
  { href: "/food-hygiene", label: "Food hygiene", requiresPlan: true },
  {
    href: "/manager",
    label: "Manager",
    requiresManager: true,
    requiresPlan: true,
  },
  { href: "/leaderboard", label: "Leaderboard", requiresPlan: true },
  { href: "/team", label: "Team", requiresPlan: true },
  { href: "/suppliers", label: "Suppliers", requiresPlan: true },
  { href: "/reports", label: "Reports", requiresPlan: true },

  // account pages (ok without plan)
  { href: "/locations", label: "Locations & sites" },
  { href: "/billing", label: "Billing & subscription" },
  { href: "/guides", label: "Guides" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help & support" },
];

const publicLinks: { href: string; label: string }[] = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
  { href: "/help", label: "Help & support" },
];

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // ✅ NEW: determine manager status from team_members (like NavTabs)
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

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Account";

  // If auth not ready yet, don’t show anything to avoid the “logged-out” flash
  if (!ready) return null;

  // When logged in, apply manager + plan gating
  const links: { href: string; label: string }[] = user
    ? authedLinks.filter(
        (l) =>
          (!l.requiresManager || canSeeManager) &&
          (!l.requiresPlan || hasValid)
      )
    : publicLinks;

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
              <div className="font-semibold text-slate-900">{name}</div>
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
            </nav>

            {/* Sign out / sign in footer */}
            <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center justify-center rounded-xl bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
