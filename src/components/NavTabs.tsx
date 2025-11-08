"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2">
      {TABS.map((t) => {
        const active =
          pathname === t.href ||
          (pathname?.startsWith(t.href + "/") ?? false);

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              className={[
                "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-black text-white"
                  : "text-slate-700 hover:bg-gray-100 hover:text-black",
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
