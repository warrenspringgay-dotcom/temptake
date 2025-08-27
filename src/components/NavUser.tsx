"use client";

import React, { useMemo, useState } from "react";
import { useI18n } from "@/i18n";

/**
 * Minimal auth fascia:
 * - Shows a Sign in button if no user
 * - Shows initials + menu with Sign out if user exists
 * Replace the fake user state with your real auth (Supabase, etc.)
 */

type NavUserProps = {
  mobile?: boolean; // renders compact list style for mobile menu
};

export default function NavUser({ mobile = false }: NavUserProps) {
  const { t } = useI18n();

  // TODO: wire to real auth
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const initials = useMemo(() => {
    if (!user?.name) return "GU";
    return user.name
      .split(" ")
      .map((s) => s[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "GU";
  }, [user]);

  const signIn = () => {
    // fake sign-in for now
    setUser({ name: "Guest User", email: "guest@example.com" });
  };

  const signOut = () => {
    setUser(null);
  };

  if (mobile) {
    // Mobile menu variant: stacked list
    return (
      <div className="flex flex-col text-sm">
        {user ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium">{user.name}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
              </div>
            </div>
            <button
              className="text-left px-3 py-2 rounded-md hover:bg-gray-50"
              onClick={signOut}
            >
              {t("signOut")}
            </button>
          </>
        ) : (
          <button
            className="text-left px-3 py-2 rounded-md hover:bg-gray-50"
            onClick={signIn}
          >
            {t("signIn")}
          </button>
        )}
      </div>
    );
  }

  // Desktop dropdown
  return user ? (
    <div className="relative">
      <details className="group">
        <summary className="list-none inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm">
            {initials}
          </span>
          <svg
            className="text-slate-500 group-open:rotate-180 transition-transform"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </summary>
        <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-200 bg-white shadow-md py-2 text-sm z-50">
          <div className="px-3 pb-2">
            <div className="font-medium truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
          <div className="border-t border-gray-100 my-1" />
          <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={signOut}>
            {t("signOut")}
          </button>
        </div>
      </details>
    </div>
  ) : (
    <button
      onClick={signIn}
      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      {t("signIn")}
    </button>
  );
}
