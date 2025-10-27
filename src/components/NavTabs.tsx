// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close panel on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click / ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClick);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <>
      {/* Desktop / tablet tabs */}
      <ul className="hidden md:flex flex-nowrap items-center justify-center gap-1">
        {TABS.map((t) => {
          const active =
            pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              className={[
                "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors",
                active ? "bg-black text-white" : "text-slate-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {t.label}
            </Link>
          </li>
        );
        })}
      </ul>

      {/* Mobile: hamburger + slide-down panel */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 items-center rounded-md px-3 text-sm border hover:bg-gray-50"
        >
          {/* hamburger icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Backdrop */}
        {open && (
          <div className="fixed inset-0 z-40 bg-black/20" />
        )}

        {/* Panel */}
        <div
          ref={panelRef}
          className={[
            "absolute left-0 right-0 z-50 mt-2 origin-top",
            open ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0",
            "transition duration-150 ease-out",
          ].join(" ")}
        >
          <div className="mx-4 rounded-xl border bg-white shadow-sm overflow-hidden">
            <nav className="flex flex-col py-1">
              {TABS.map((t) => {
                const active =
                  pathname === t.href ||
                  (pathname?.startsWith(t.href + "/") ?? false);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={[
                      "px-4 py-2 text-sm",
                      active
                        ? "bg-black text-white"
                        : "text-slate-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
