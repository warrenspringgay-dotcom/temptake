"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

import { useAuth } from "@/components/AuthProvider";

function initialsFromEmail(email?: string | null) {
  if (!email) return "?";
  const part = email.split("@")[0] || "";
  const chars = part.replace(/[^a-z0-9]/gi, "").slice(0, 2);
  return (chars || "?").toUpperCase();
}

function itemCls(disabled?: boolean) {
  return [
    "block rounded-lg px-3 py-2",
    disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-50",
  ].join(" ");
}

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, ready } = useAuth();

  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const email = user?.email ?? null;
  const inits = useMemo(() => initialsFromEmail(email), [email]);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  if (!ready) {
    return <div className="h-9 w-9 rounded-full border bg-white/80" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-900"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-xs font-semibold hover:bg-gray-50"
        title={email ?? "Signed in"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {inits}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border bg-white shadow-lg"
        >
          <div className="border-b px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Signed in as
            </div>
            <div className="truncate text-sm font-semibold text-gray-900">{email ?? "—"}</div>
          </div>

          <div className="p-2 text-sm">
            <Link href="/settings" className={itemCls()} role="menuitem">
              Settings
            </Link>

            <Link href="/food-hygiene-rating-log" className={itemCls()} role="menuitem">
              Food hygiene rating log
            </Link>

            <Link href="/locations" className={itemCls()} role="menuitem">
              Locations
            </Link>

            <Link href="/billing" className={itemCls()} role="menuitem">
              Billing &amp; subscription
            </Link>

            <Link href="/guides" className={itemCls()} role="menuitem">
              Guides
            </Link>

            <Link href="/support" className={itemCls()} role="menuitem">
              Help &amp; support
            </Link>

            <div className="my-2 border-t" />

            <button
              type="button"
              onClick={signOut}
              className="block w-full rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
