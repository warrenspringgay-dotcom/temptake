"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
};

const MARKETING_TABS: Tab[] = [
  { href: "/", label: "Home" },
  { href: "/sectors", label: "Sectors" },
  { href: "/demo", label: "Demo App" },
  { href: "/food-hygiene-app", label: "The App" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guides", label: "Guides" },
  { href: "/templates", label: "Templates" },
];

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  if (href === "/sectors") {
    return (
      pathname === "/sectors" ||
      pathname.startsWith("/sectors/") ||
      pathname.endsWith("-food-safety-app")
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export default function MarketingMobileMenu() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />

          <div className="absolute right-2 top-2 w-[calc(100%-1rem)] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-bold text-slate-900">TempTake</div>
                <div className="text-[11px] text-slate-500">
                  Food hygiene app for UK kitchens
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

            <div className="p-2">
              <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Navigation
              </div>

              <div className="space-y-1">
                {MARKETING_TABS.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setOpen(false)}
                    className={cls(
                      "block rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive(pathname, tab.href)
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <div className="my-3 border-t border-slate-200" />

              <div className="space-y-2">
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}