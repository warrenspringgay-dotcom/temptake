// src/components/NavTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Reports" },
];




export default function NavTabs({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-nowrap items-center justify-center gap-1">
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
  );
}
