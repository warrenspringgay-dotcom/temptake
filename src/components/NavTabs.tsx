"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActiveOrgIdClient } from "@/lib/orgClient";

type Tab = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresManager?: boolean;
};

const BASE_TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routines", label: "Routines" },
  { href: "/allergens", label: "Allergens" },
  { href: "/cleaning-rota", label: "Cleaning Rota" },
  { href: "/team", label: "Team" },
  { href: "/suppliers", label: "Suppliers" },

  // Manager dashboard – mark as manager-only
  {
    href: "/manager",
    label: "Manager Dashboard",
    requiresManager: true,
  },

  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="h-4 w-4 text-amber-500" />,
  },
  { href: "/reports", label: "Reports" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const [canSeeManager, setCanSeeManager] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Resolve role from team_members (owner / manager / admin)
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getActiveOrgIdClient();
        const { data: userRes } = await supabase.auth.getUser();
        const email = userRes.user?.email?.toLowerCase() ?? null;

        if (!orgId || !email) {
          setCanSeeManager(false);
          setCheckingRole(false);
          return;
        }

        const { data, error } = await supabase
          .from("team_members")
          .select("role,email")
          .eq("org_id", orgId)
          .eq("email", email)
          .maybeSingle();

        if (error || !data) {
          setCanSeeManager(false);
          setCheckingRole(false);
          return;
        }

        const role = (data.role ?? "").toLowerCase();
        const allowed =
          role === "owner" || role === "manager" || role === "admin";

        setCanSeeManager(allowed);
      } catch {
        setCanSeeManager(false);
      } finally {
        setCheckingRole(false);
      }
    })();
  }, []);

  const tabs = useMemo(
    () =>
      BASE_TABS.filter((t) =>
        t.requiresManager ? canSeeManager : true
      ),
    [canSeeManager]
  );

  return (
    <ul className="flex flex-nowrap items-center gap-1 min-w-max px-2">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (pathname?.startsWith(t.href + "/") ?? false);

        return (
          <li key={t.href} className="shrink-0">
            <Link
              href={t.href}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-black text-white"
                  : "text-slate-700 hover:bg-gray-100 hover:text-black",
              ].join(" ")}
            >
              {t.icon && <span>{t.icon}</span>}
              {t.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
