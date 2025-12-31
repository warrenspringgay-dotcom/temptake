// src/components/NavTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import BrandLogo from "./BrandLogo";
import { Menu } from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Tab = { href: string; label: string };
type AppRole = "owner" | "manager" | "staff" | "admin" | string | null;

function isManagerRole(role: AppRole) {
  const r = (role ?? "").toString().toLowerCase();
  return r === "owner" || r === "manager" || r === "admin";
}

function readRoleFromSession(session: Session | null): AppRole {
  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const appMeta = (user?.app_metadata ?? {}) as Record<string, any>;
  return (meta.role as string | undefined) ?? (appMeta.role as string | undefined) ?? null;
}

// NOTE: "/" is marketing in HeaderSwitcher, so don't use it for app dashboard.
const MANAGER_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/manager", label: "Manager Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

const STAFF_TABS: Tab[] = [
  { href: "/staff", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [roleReady, setRoleReady] = useState(false);

  const [open, setOpen] = useState(false);

  const tabs = useMemo(() => {
    // least privilege until role is known
    if (!roleReady) return STAFF_TABS;
    return isManagerRole(role) ? MANAGER_TABS : STAFF_TABS;
  }, [role, roleReady]);

  useEffect(() => {
    let mounted = true;

    const resolveRole = async (session: Session | null): Promise<AppRole> => {
      const sessionRole = readRoleFromSession(session);
      if (sessionRole) return sessionRole;

      const userId = session?.user?.id;
      if (!userId) return null;

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) return null;
      return (prof?.role as string | undefined) ?? null;
    };

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      setUserEmail(session?.user?.email ?? null);

      const r = await resolveRole(session);
      if (!mounted) return;

      setRole(r);
      setRoleReady(true);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_evt: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        setUserEmail(session?.user?.email ?? null);

        const r = await resolveRole(session);
        if (!mounted) return;

        setRole(r);
        setRoleReady(true);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const homeHref = isManagerRole(role) ? "/dashboard" : "/staff";

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-3 py-2 shadow-sm md:px-4">
        {/* Left: brand + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <button
            className="mr-1 rounded-md p-2 hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href={homeHref} className="flex items-center gap-2">
            <BrandLogo className="h-6 w-6" />
            <span className="text-base font-semibold">TempTake</span>
          </Link>
        </div>

        {/* Center: tabs (hidden on mobile) */}
        <div className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                (isActive(t.href)
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100")
              }
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {userEmail ? (
            <>
              <span className="hidden text-xs text-gray-500 sm:block">
                {userEmail}
              </span>
              <button
                onClick={signOut}
                className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-black px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <div
            className="absolute left-0 top-0 h-full w-[78%] max-w-[320px] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b px-3 py-3">
              <div className="flex items-center gap-2">
                <BrandLogo className="h-6 w-6" />
                <span className="text-base font-semibold">TempTake</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-2">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={
                    "rounded-md px-3 py-2 text-sm " +
                    (isActive(t.href)
                      ? "bg-black text-white"
                      : "text-gray-800 hover:bg-gray-100")
                  }
                >
                  {t.label}
                </Link>
              ))}

              <div className="mt-3 border-t pt-3">
                {userEmail ? (
                  <button
                    onClick={signOut}
                    className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Sign out
                    <span className="block truncate text-xs text-gray-500">
                      {userEmail}
                    </span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-md bg-black px-3 py-2 text-center text-sm font-medium text-white hover:bg-gray-900"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
