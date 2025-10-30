"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

type UserLike = { email?: string | null } | null | undefined;

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs({ user }: { user?: UserLike }) {
  const pathname = usePathname();

  // unified mobile menu
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on route change
  useEffect(() => setOpen(false), [pathname]);

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

      {/* Mobile: single hamburger that includes tabs + help + settings + auth */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Backdrop */}
        {open && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/25"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Fixed dropdown panel */}
        <div
          ref={panelRef}
          className={[
            "fixed left-3 right-3 top-14 z-50 origin-top",
            open ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0",
            "transition duration-150 ease-out",
          ].join(" ")}
        >
          <div className="rounded-xl border bg-white shadow-xl overflow-hidden">
            {/* sticky header in panel */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/75">
              <div className="text-sm font-semibold">Menu</div>
              <div className="text-xs text-gray-600 truncate max-w-[60%]">
                {user?.email ?? "Guest"}
              </div>
            </div>

            {/* nav links */}
            <nav className="max-h-[70vh] overflow-y-auto p-1">
              <ul className="divide-y">
                {TABS.map((t) => {
                  const active =
                    pathname === t.href || (pathname?.startsWith(t.href + "/") ?? false);
                  return (
                    <li key={t.href}>
                      <Link
                        href={t.href}
                        className={[
                          "block px-4 py-3 text-sm",
                          active ? "bg-black text-white" : "text-slate-700 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {t.label}
                      </Link>
                    </li>
                  );
                })}

                {/* extras */}
                <li>
                  <Link href="/help" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50">
                    Help
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50">
                    Settings
                  </Link>
                </li>
                <li>
                  {user ? (
                    <Link href="/logout" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50">
                      Sign out
                    </Link>
                  ) : (
                    <Link href="/login" className="block px-4 py-3 text-sm text-slate-700 hover:bg-gray-50">
                      Login
                    </Link>
                  )}
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
