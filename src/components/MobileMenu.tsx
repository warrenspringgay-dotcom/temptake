// src/components/MobileMenu.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseBrowser";
import { useAuth } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Tab = {
  href: string;
  label: string;
  requiresManager?: boolean;
  requiresPlan?: boolean;
};

const APP_NAV: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
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

const ACCOUNT_LINKS: { href: string; label: string }[] = [
  { href: "/settings", label: "Settings" },
  { href: "/locations", label: "Locations" },
  { href: "/billing", label: "Billing & subscription" },
  { href: "/guides", label: "Guides" },
  { href: "/help", label: "Help & support" },
];

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileMenu() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { user, ready } = useAuth();
  const { hasValid } = useSubscriptionStatus();

  const [open, setOpen] = useState(false);
  const [canSeeManager, setCanSeeManager] = useState(false);

  // close on route change
  useEffect(() => setOpen(false), [pathname]);

  // compute manager access (same idea as your existing gating)
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

  const navLinks = useMemo(() => {
    if (!user) return [];
    return APP_NAV.filter(
      (l) =>
        (!l.requiresManager || canSeeManager) &&
        (!l.requiresPlan || hasValid)
    );
  }, [user, canSeeManager, hasValid]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  if (!ready) return null;

  return (
    <>
      {/* Hamburger button with logo (mobile only) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
        aria-label="Open menu"
      >
        <Image src="/logo.png" alt="" width={22} height={22} className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          {/* sheet */}
          <div className="absolute right-2 top-2 w-[calc(100%-1rem)] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            {/* header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={26} height={26} className="h-6 w-6" />
                <div className="leading-tight">
                  <div className="text-sm font-bold text-slate-900">TempTake</div>
                  <div className="text-[11px] text-slate-500">
                    {user ? (user.email ?? "Signed in") : "Welcome"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-2">
              {/* Signed out */}
              {!user ? (
                <div className="space-y-2 p-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl bg-black px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-900"
                  >
                    Get started
                  </Link>
                </div>
              ) : (
                <>
                  {/* NAV */}
                  <div className="px-2 pt-2">
                    <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                      Navigation
                    </div>

                    <div className="space-y-1">
                      {navLinks.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className={cls(
                            "block rounded-2xl px-4 py-3 text-sm font-medium",
                            isActive(pathname, l.href)
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-800 hover:bg-slate-50"
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="my-3 border-t border-slate-200" />

                  {/* ACCOUNT */}
                  <div className="px-2">
                    <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                      Account
                    </div>

                    <div className="space-y-1">
                      {ACCOUNT_LINKS.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className={cls(
                            "block rounded-2xl px-4 py-3 text-sm font-medium",
                            isActive(pathname, l.href)
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-800 hover:bg-slate-50"
                          )}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={signOut}
                        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
